import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Phone, Mail, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Activity {
  activity_id: string;
  activity_type: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle2,
  note: FileText,
};

const activityColors = {
  call: 'from-success/20 to-success/5 text-success',
  email: 'from-info/20 to-info/5 text-info',
  meeting: 'from-warning/20 to-warning/5 text-warning',
  task: 'from-primary/20 to-primary/5 text-primary',
  note: 'from-muted to-muted/50 text-muted-foreground',
};

export function RecentActivities() {
  const { tenantId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchActivities = async () => {
      const { data } = await supabase
        .from('activities')
        .select('activity_id, activity_type, title, is_completed, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

      setActivities((data as Activity[]) || []);
      setLoading(false);
    };

    fetchActivities();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 animate-pulse">
            <div className="h-10 w-10 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-lg bg-muted" />
              <div className="h-3 w-1/2 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="rounded-2xl bg-gradient-to-br from-muted to-muted/50 p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">No recent activities</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Activities will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || FileText;
        const colorClass = activityColors[activity.activity_type as keyof typeof activityColors] || activityColors.note;

        return (
          <div 
            key={activity.activity_id} 
            className={cn(
              "relative flex items-start gap-4 p-3 rounded-xl transition-all duration-200",
              "hover:bg-muted/30 group cursor-pointer"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Timeline connector */}
            {index < activities.length - 1 && (
              <div className="absolute left-[27px] top-14 w-0.5 h-[calc(100%-24px)] bg-gradient-to-b from-border to-transparent" />
            )}
            
            {/* Icon */}
            <div className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
              'transition-transform duration-200 group-hover:scale-110',
              colorClass
            )}>
              <Icon className="h-4 w-4" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium truncate',
                activity.is_completed && 'line-through text-muted-foreground'
              )}>
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
            
            {/* Completion indicator */}
            {activity.is_completed && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-success/10">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
