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
  gradientFrom?: string;
  gradientTo?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  iconClassName,
  gradientFrom = 'from-primary/20',
  gradientTo = 'to-primary/5'
}: StatCardProps) {
  return (
    <div className="stat-card group">
      {/* Decorative gradient orb */}
      <div className={cn(
        "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500",
        "bg-gradient-to-br",
        gradientFrom,
        gradientTo
      )} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {title}
          </p>
          <p className="text-4xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {change && (
            <div className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full',
              change.value >= 0 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'
            )}>
              <span>{change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value)}%</span>
              <span className="text-muted-foreground text-xs font-normal">{change.label}</span>
            </div>
          )}
        </div>
        
        {/* Icon with gradient background */}
        <div className={cn(
          'relative flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden',
          'bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110',
          iconClassName || 'from-primary/20 to-primary/5 text-primary'
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <Icon className="h-7 w-7 relative z-10" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
