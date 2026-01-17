import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Users, Target, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  totalContacts: number;
  totalDeals: number;
  totalRevenue: number;
  successRate: number;
}

export default function Dashboard() {
  const { profile, tenantId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalDeals: 0,
    totalRevenue: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;

    const fetchStats = async () => {
      // Fetch contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Fetch deals count
      const { count: dealsCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Fetch revenue using RPC
      const { data: revenueData } = await supabase.rpc('calculate_tenant_revenue', {
        p_tenant_id: tenantId,
      });

      // Fetch success rate using RPC
      const { data: successRateData } = await supabase.rpc('get_deal_success_rate', {
        p_tenant_id: tenantId,
      });

      setStats({
        totalContacts: contactsCount || 0,
        totalDeals: dealsCount || 0,
        totalRevenue: Number(revenueData) || 0,
        successRate: Number(successRateData) || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [tenantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your sales today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Contacts"
            value={loading ? '—' : stats.totalContacts}
            icon={Users}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatCard
            title="Active Deals"
            value={loading ? '—' : stats.totalDeals}
            icon={Target}
            iconClassName="bg-info/10 text-info"
          />
          <StatCard
            title="Total Revenue"
            value={loading ? '—' : formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            iconClassName="bg-success/10 text-success"
          />
          <StatCard
            title="Win Rate"
            value={loading ? '—' : `${stats.successRate}%`}
            icon={TrendingUp}
            iconClassName="bg-warning/10 text-warning"
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Sales Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineChart />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentActivities />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
