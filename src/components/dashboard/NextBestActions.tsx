import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Phone, 
  ArrowRight, 
  Mail, 
  CheckCircle2, 
  Lightbulb,
  RefreshCw,
  AlertCircle
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
  high: 'border-l-destructive bg-destructive/5',
  medium: 'border-l-warning bg-warning/5',
  low: 'border-l-muted-foreground bg-muted/30',
};

const priorityBadgeStyles: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-muted text-muted-foreground',
};

export function NextBestActions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
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
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-primary/10 p-3 mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-medium text-foreground mb-2">AI-Powered Insights</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-[200px]">
          Get personalized action suggestions based on your CRM data
        </p>
        <Button onClick={fetchSuggestions} size="sm">
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
          <div key={i} className="p-3 rounded-lg border border-l-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
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
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground mb-3">{error}</p>
        <Button onClick={fetchSuggestions} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-success mb-2" />
        <p className="text-sm text-muted-foreground">All caught up! No urgent actions needed.</p>
        <Button onClick={fetchSuggestions} size="sm" variant="ghost" className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.slice(0, 5).map((suggestion, index) => {
        const Icon = categoryIcons[suggestion.category] || Lightbulb;
        return (
          <div
            key={index}
            className={cn(
              'p-3 rounded-lg border border-l-4 transition-colors hover:bg-accent/50',
              priorityStyles[suggestion.priority] || priorityStyles.medium
            )}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-background p-2 shadow-sm">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {suggestion.target}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full capitalize',
                    priorityBadgeStyles[suggestion.priority] || priorityBadgeStyles.medium
                  )}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">
                  {suggestion.action}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
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
        className="w-full text-muted-foreground hover:text-foreground"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Suggestions
      </Button>
    </div>
  );
}
