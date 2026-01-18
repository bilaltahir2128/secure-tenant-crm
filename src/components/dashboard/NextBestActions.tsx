import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Phone, 
  ArrowRight, 
  Mail, 
  CheckCircle2, 
  Lightbulb,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Suggestion {
  action: string;
  target: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'follow_up' | 'deal_progress' | 'outreach' | 'task' | 'opportunity';
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  follow_up: Phone,
  deal_progress: ArrowRight,
  outreach: Mail,
  task: CheckCircle2,
  opportunity: Lightbulb,
};

const priorityStyles: Record<string, string> = {
  high: 'border-l-destructive bg-gradient-to-r from-destructive/10 to-transparent',
  medium: 'border-l-warning bg-gradient-to-r from-warning/10 to-transparent',
  low: 'border-l-muted-foreground bg-gradient-to-r from-muted/50 to-transparent',
};

const priorityBadgeStyles: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-warning/15 text-warning',
  low: 'bg-muted text-muted-foreground',
};

export function NextBestActions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('next-best-action');
      
      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuggestions(data?.suggestions || []);
      setHasLoaded(true);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      const message = err instanceof Error ? err.message : 'Failed to get suggestions';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasLoaded && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent blur-xl opacity-30 animate-pulse-slow" />
          <div className="relative rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h3 className="font-semibold text-foreground mb-2">AI-Powered Insights</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-[220px]">
          Get personalized action suggestions based on your CRM data
        </p>
        <Button 
          onClick={fetchSuggestions} 
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg hover:shadow-glow transition-all duration-200"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Suggestions
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="p-4 rounded-xl border border-l-4 border-l-muted animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded-lg" />
                <div className="h-3 w-1/2 bg-muted rounded-lg" />
              </div>
            </div>
          </div>
        ))}
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          Analyzing your CRM data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground mb-4 max-w-[200px]">{error}</p>
        <Button onClick={fetchSuggestions} size="sm" variant="outline" className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-2xl bg-success/10 p-4 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <p className="text-sm text-muted-foreground">All caught up! No urgent actions needed.</p>
        <Button onClick={fetchSuggestions} size="sm" variant="ghost" className="mt-3 rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {suggestions.slice(0, 5).map((suggestion, index) => {
        const Icon = categoryIcons[suggestion.category] || Lightbulb;
        const isExpanded = expandedIndex === index;
        return (
          <div
            key={index}
            onClick={() => toggleExpand(index)}
            className={cn(
              'p-4 rounded-xl border border-l-4 transition-all duration-200 cursor-pointer',
              'hover:shadow-md',
              priorityStyles[suggestion.priority] || priorityStyles.medium
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-background/80 p-2.5 shadow-sm shrink-0 border border-border/30">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {suggestion.target}
                    </span>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                      priorityBadgeStyles[suggestion.priority] || priorityBadgeStyles.medium
                    )}>
                      {suggestion.priority}
                    </span>
                  </div>
                  <div className={cn(
                    "transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <p className={cn(
                  "text-sm font-medium text-foreground transition-all",
                  !isExpanded && "line-clamp-2"
                )}>
                  {suggestion.action}
                </p>
                <p className={cn(
                  "text-xs text-muted-foreground mt-1.5 transition-all",
                  !isExpanded && "line-clamp-1"
                )}>
                  {suggestion.reason}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      
      <Button 
        onClick={fetchSuggestions} 
        size="sm" 
        variant="ghost" 
        className="w-full text-muted-foreground hover:text-foreground rounded-xl"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Suggestions
      </Button>
    </div>
  );
}
