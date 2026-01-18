import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles,
  Loader2,
  User,
  Bot,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Simple markdown-like formatting for chat messages
function formatMessage(content: string) {
  if (!content) return null;
  
  // Split by lines and process
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">{formatInlineText(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const formatInlineText = (text: string) => {
    // Bold text **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      flushList();
      return;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\.\s/)) {
      inList = true;
      const content = trimmed.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
      listItems.push(content);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={index} className="font-semibold text-sm mt-3 mb-1">
          {formatInlineText(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={index} className="font-bold text-sm mt-3 mb-1">
          {formatInlineText(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={index} className="text-sm mb-2 last:mb-0">
        {formatInlineText(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

export function AIChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = async (userMessage: string) => {
    const userMsg: Message = { role: 'user', content: userMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantContent = '';

    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Please log in to use the chat');
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (resp.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (resp.status === 402) {
        throw new Error('AI credits exhausted. Please add credits.');
      }
      if (!resp.ok || !resp.body) {
        throw new Error('Failed to start chat');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return prev;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return prev;
              });
            }
          } catch { /* ignore */ }
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to send message',
        variant: 'destructive',
      });
      // Remove the empty assistant message if error
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    streamChat(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestedQuestions = [
    "What's my pipeline value?",
    "Show me my top deals",
    "Any overdue tasks?",
    "Summarize my contacts",
  ];

  return (
    <>
      {/* Toggle Button - Gradient with glow */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-2xl z-50 transition-all duration-300",
          "shadow-lg hover:shadow-xl",
          isOpen 
            ? "bg-muted hover:bg-muted/90 text-foreground rotate-90" 
            : "bg-gradient-to-br from-primary to-accent hover:shadow-glow text-white"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>

      {/* Chat Panel - Glass morphism */}
      <div
        className={cn(
          "fixed bottom-24 right-6 w-[420px] h-[560px] z-40",
          "flex flex-col transition-all duration-500 ease-out overflow-hidden",
          "rounded-3xl border border-border/30",
          "bg-card/95 backdrop-blur-xl shadow-2xl",
          isOpen 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 translate-y-8 scale-95 pointer-events-none"
        )}
        style={{
          boxShadow: isOpen ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px -10px hsl(var(--primary) / 0.2)' : undefined
        }}
      >
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-5 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent blur-md opacity-40" />
              <div className="relative rounded-xl bg-gradient-to-br from-primary to-accent p-2.5">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-base">Sales Assistant</h3>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearChat} 
              title="Clear chat"
              className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Messages - Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 flex flex-col scrollbar-thin"
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Your AI-powered sales companion
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Ask me anything about your CRM data!
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
                  Suggested
                </p>
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-left h-auto py-3 px-4 rounded-xl",
                      "border-border/50 hover:border-primary/30 hover:bg-primary/5",
                      "transition-all duration-200"
                    )}
                    onClick={() => {
                      setInput(q);
                      streamChat(q);
                    }}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-3 text-primary shrink-0" />
                    <span className="text-sm">{q}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 animate-fade-in",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-2 h-9 w-9 shrink-0 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl max-w-[85%] transition-all",
                      msg.role === 'user' 
                        ? "bg-gradient-to-br from-primary to-primary/90 text-white px-4 py-3 shadow-lg" 
                        : "bg-muted/50 border border-border/30 px-4 py-3"
                    )}
                  >
                    {msg.content ? (
                      msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {formatMessage(msg.content)}
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )
                    ) : (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="rounded-xl bg-muted p-2 h-9 w-9 shrink-0 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input - Refined */}
        <div className="p-4 border-t border-border/30 bg-background/50 backdrop-blur-sm shrink-0">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your sales..."
              disabled={isLoading}
              className="flex-1 bg-background border-border/50 rounded-xl h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              size="icon"
              className={cn(
                "shrink-0 rounded-xl h-11 w-11 transition-all duration-200",
                input.trim() && !isLoading 
                  ? "bg-gradient-to-br from-primary to-accent shadow-lg hover:shadow-glow" 
                  : ""
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
