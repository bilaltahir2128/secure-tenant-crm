import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  Lightbulb,
  Mail,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
}

const emailTypes = [
  { value: 'follow_up', label: 'Follow-up', description: 'Check in and maintain relationship' },
  { value: 'proposal', label: 'Proposal', description: 'Present your solution or offer' },
  { value: 'meeting_request', label: 'Meeting Request', description: 'Schedule a call or meeting' },
  { value: 'thank_you', label: 'Thank You', description: 'Express gratitude' },
  { value: 're_engagement', label: 'Re-engagement', description: 'Reconnect with a quiet contact' },
];

export function EmailDraftDialog({ 
  open, 
  onOpenChange, 
  contactId, 
  contactName,
  contactEmail 
}: EmailDraftDialogProps) {
  const [emailType, setEmailType] = useState('follow_up');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string; tips: string[] } | null>(null);
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);
  const { toast } = useToast();

  const generateDraft = async () => {
    setLoading(true);
    setDraft(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-draft', {
        body: { contactId, emailType }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      setDraft(data.draft);
    } catch (err) {
      console.error('Failed to generate email draft:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate email draft',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'subject' | 'body') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopied(null), 2000);
  };

  const openMailClient = () => {
    if (!draft || !contactEmail) return;
    const mailtoUrl = `mailto:${contactEmail}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body.replace(/\\n/g, '\n'))}`;
    window.open(mailtoUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Generate Email for {contactName}
            <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">AI</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Email Type Selection */}
          <div className="space-y-2">
            <Label>Email Type</Label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={generateDraft} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Email Draft
              </>
            )}
          </Button>

          {/* Generated Draft */}
          {draft && (
            <div className="space-y-4 pt-2">
              {/* Subject */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subject</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(draft.subject, 'subject')}
                  >
                    {copied === 'subject' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Input 
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className="font-medium"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email Body</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(draft.body.replace(/\\n/g, '\n'), 'body')}
                  >
                    {copied === 'body' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Textarea 
                  value={draft.body.replace(/\\n/g, '\n')}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* Tips */}
              {draft.tips && draft.tips.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="h-4 w-4 text-warning" />
                    Personalization Tips
                  </div>
                  <ul className="space-y-1">
                    {draft.tips.map((tip, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={generateDraft}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                {contactEmail && (
                  <Button 
                    onClick={openMailClient}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Open in Mail
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
