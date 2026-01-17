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
  lead: 'hsl(234 89% 54%)',
  qualified: 'hsl(199 89% 48%)',
  proposal: 'hsl(38 92% 50%)',
  closed_won: 'hsl(160 84% 39%)',
  closed_lost: 'hsl(0 84% 60%)',
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
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (data.every(d => d.count === 0)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground">No deals yet</p>
        <p className="text-sm text-muted-foreground/70">Create your first deal to see the pipeline</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis 
          dataKey="stage" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value: number, name: string) => [
            name === 'count' ? `${value} deals` : `$${value.toLocaleString()}`,
            name === 'count' ? 'Deals' : 'Value'
          ]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell 
              key={entry.stage} 
              fill={stageColors[(entry as any).originalStage] || stageColors.lead} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
