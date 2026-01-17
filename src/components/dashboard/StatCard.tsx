import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  iconClassName?: string;
}

export function StatCard({ title, value, change, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="stat-card-value mt-2">{value}</p>
          {change && (
            <p className={cn(
              'text-sm mt-2 flex items-center gap-1',
              change.value >= 0 ? 'text-success' : 'text-destructive'
            )}>
              <span>{change.value >= 0 ? '+' : ''}{change.value}%</span>
              <span className="text-muted-foreground">{change.label}</span>
            </p>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          iconClassName || 'bg-primary/10 text-primary'
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
