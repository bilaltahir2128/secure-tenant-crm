import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

const stageColors: Record<string, string> = {
  lead: 'hsl(262 83% 58%)',
  qualified: 'hsl(210 100% 55%)',
  proposal: 'hsl(38 95% 55%)',
  closed_won: 'hsl(160 84% 39%)',
  closed_lost: 'hsl(0 75% 60%)',
};

interface PipelineData {
  stage: string;
  count: number;
  value: number;
}

export function PipelineChart() {
  const { tenantId } = useAuth();
  const [data, setData] = useState<PipelineData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchPipelineData = async () => {
      const { data: deals } = await supabase
        .from('deals')
        .select('stage, value')
        .eq('tenant_id', tenantId);

      if (deals) {
        const stageMap = new Map<string, { count: number; value: number }>();
        
        // Initialize all stages
        Object.keys(stageLabels).forEach(stage => {
          stageMap.set(stage, { count: 0, value: 0 });
        });

        // Count deals per stage
        deals.forEach((deal) => {
          const existing = stageMap.get(deal.stage) || { count: 0, value: 0 };
          stageMap.set(deal.stage, {
            count: existing.count + 1,
            value: existing.value + Number(deal.value || 0),
          });
        });

        const chartData = Array.from(stageMap.entries()).map(([stage, data]) => ({
          stage: stageLabels[stage] || stage,
          count: data.count,
          value: data.value,
          originalStage: stage,
        }));

        setData(chartData);
      }
      setLoading(false);
    };

    fetchPipelineData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-8 bg-muted rounded animate-pulse" />
            <div className="w-2 h-12 bg-muted rounded animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="w-2 h-6 bg-muted rounded animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-10 bg-muted rounded animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="w-2 h-4 bg-muted rounded animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (data.every(d => d.count === 0)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-4 mb-4">
          <div className="flex gap-1">
            {[20, 35, 25, 40, 15].map((h, i) => (
              <div 
                key={i} 
                className="w-3 rounded-t bg-gradient-to-t from-primary/30 to-primary/10"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>
        <p className="text-muted-foreground font-medium">No deals yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Create your first deal to see the pipeline</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <defs>
          {Object.entries(stageColors).map(([stage, color]) => (
            <linearGradient key={stage} id={`gradient-${stage}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          ))}
        </defs>
        <XAxis 
          dataKey="stage" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted) / 0.3)', radius: 8 }}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border) / 0.5)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)',
            padding: '12px 16px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
          formatter={(value: number, name: string) => [
            name === 'count' ? `${value} deals` : `$${value.toLocaleString()}`,
            name === 'count' ? 'Deals' : 'Value'
          ]}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
          {data.map((entry) => (
            <Cell 
              key={entry.stage} 
              fill={`url(#gradient-${(entry as any).originalStage})`}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
