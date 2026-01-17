import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Deal {
  deal_id: string;
  title: string;
  stage: string;
  value: number;
  expected_close_date: string | null;
}

const stages = ['lead', 'qualified', 'proposal', 'closed_won', 'closed_lost'];
const stageLabels: Record<string, string> = { lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal', closed_won: 'Won', closed_lost: 'Lost' };
const stageClasses: Record<string, string> = { lead: 'stage-lead', qualified: 'stage-qualified', proposal: 'stage-proposal', closed_won: 'stage-won', closed_lost: 'stage-lost' };

export default function Deals() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', stage: 'lead', value: '' });

  const fetchDeals = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from('deals').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    setDeals((data as Deal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, [tenantId]);

  const handleCreate = async () => {
    if (!tenantId) return;
    const { error } = await supabase.from('deals').insert([{ title: form.title, stage: form.stage as any, value: Number(form.value) || 0, tenant_id: tenantId }]);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deal created!' }); setDialogOpen(false); setForm({ title: '', stage: 'lead', value: '' }); fetchDeals(); }
  };

  const groupedDeals = stages.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Deals</h1><p className="text-muted-foreground">Track your sales pipeline</p></div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Deal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Deal</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                <div><Label>Stage</Label>
                  <Select value={form.stage} onValueChange={v => setForm({...form, stage: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stages.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Value ($)</Label><Input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} /></div>
              </div>
              <Button onClick={handleCreate} className="mt-4 w-full">Create Deal</Button>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? <p className="text-muted-foreground">Loading...</p> : (
          <div className="grid grid-cols-5 gap-4">
            {stages.map(stage => (
              <div key={stage} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn('stage-badge', stageClasses[stage])}>{stageLabels[stage]}</span>
                  <span className="text-sm text-muted-foreground">{groupedDeals[stage].length}</span>
                </div>
                <div className="space-y-2">
                  {groupedDeals[stage].map(deal => (
                    <div key={deal.deal_id} className="pipeline-card">
                      <p className="font-medium text-sm">{deal.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <DollarSign className="h-3 w-3" />{Number(deal.value).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {groupedDeals[stage].length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No deals</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
