import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentActivities } from '@/components/dashboard/RecentActivities';
import { PipelineChart } from '@/components/dashboard/PipelineChart';
import { NextBestActions } from '@/components/dashboard/NextBestActions';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Users, Target, DollarSign, TrendingUp, Sparkles } from 'lucide-react';
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

  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardLayout>
      <div className="space-y-8 relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -z-10 animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl -z-10 animate-pulse-slow" style={{ animationDelay: '2s' }} />

        {/* Header with gradient text */}
        <div className="animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
            {greeting}
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Here's what's happening with your sales today.
          </p>
        </div>

        {/* Stats Grid with staggered animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <StatCard
              title="Total Contacts"
              value={loading ? '—' : stats.totalContacts.toLocaleString()}
              icon={Users}
              iconClassName="from-primary/30 to-primary/10 text-primary"
              gradientFrom="from-primary/30"
              gradientTo="to-primary/5"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <StatCard
              title="Active Deals"
              value={loading ? '—' : stats.totalDeals.toLocaleString()}
              icon={Target}
              iconClassName="from-info/30 to-info/10 text-info"
              gradientFrom="from-info/30"
              gradientTo="to-info/5"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <StatCard
              title="Total Revenue"
              value={loading ? '—' : formatCurrency(stats.totalRevenue)}
              icon={DollarSign}
              iconClassName="from-success/30 to-success/10 text-success"
              gradientFrom="from-success/30"
              gradientTo="to-success/5"
            />
          </div>
          <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <StatCard
              title="Win Rate"
              value={loading ? '—' : `${stats.successRate}%`}
              icon={TrendingUp}
              iconClassName="from-warning/30 to-warning/10 text-warning"
              gradientFrom="from-warning/30"
              gradientTo="to-warning/5"
            />
          </div>
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Chart */}
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '500ms' }}>
            <Card className="card-premium h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent" />
                  Sales Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PipelineChart />
              </CardContent>
            </Card>
          </div>

          {/* Next Best Actions - AI Powered */}
          <div className="row-span-2 animate-slide-up" style={{ animationDelay: '600ms' }}>
            <Card className="card-premium h-full overflow-hidden">
              <CardHeader className="pb-4 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent blur-2xl" />
                <CardTitle className="text-lg font-semibold flex items-center gap-2 relative z-10">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span>Next Best Actions</span>
                  <span className="text-[10px] font-bold tracking-widest bg-gradient-to-r from-primary to-accent text-white px-2 py-0.5 rounded-full uppercase">
                    AI
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NextBestActions />
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '700ms' }}>
            <Card className="card-premium h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-info to-success" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentActivities />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
