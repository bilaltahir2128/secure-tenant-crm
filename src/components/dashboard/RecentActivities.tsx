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
  call: 'bg-success/10 text-success',
  email: 'bg-info/10 text-info',
  meeting: 'bg-warning/10 text-warning',
  task: 'bg-primary/10 text-primary',
  note: 'bg-muted text-muted-foreground',
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
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No recent activities</p>
        <p className="text-sm text-muted-foreground/70">Activities will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activity_type as keyof typeof activityIcons] || FileText;
        const colorClass = activityColors[activity.activity_type as keyof typeof activityColors] || activityColors.note;

        return (
          <div key={activity.activity_id} className="activity-item">
            <div className={cn('activity-dot', colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className={cn(
                'text-sm font-medium',
                activity.is_completed && 'line-through text-muted-foreground'
              )}>
                {activity.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
