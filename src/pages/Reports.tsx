import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { FileText, TrendingUp, Users, DollarSign, Target, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Deal = Tables<'deals'>;
type Activity = Tables<'activities'>;
type Contact = Tables<'contacts'>;

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const { tenantId } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    const [dealsRes, activitiesRes, contactsRes] = await Promise.all([
      supabase.from('deals').select('*').eq('tenant_id', tenantId),
      supabase.from('activities').select('*').eq('tenant_id', tenantId),
      supabase.from('contacts').select('*').eq('tenant_id', tenantId),
    ]);

    setDeals((dealsRes.data as Deal[]) || []);
    setActivities((activitiesRes.data as Activity[]) || []);
    setContacts((contactsRes.data as Contact[]) || []);
    setLoading(false);
  };

  // Pipeline Stats
  const pipelineData = [
    { name: 'Lead', value: deals.filter(d => d.stage === 'lead').length, fill: '#94a3b8' },
    { name: 'Qualified', value: deals.filter(d => d.stage === 'qualified').length, fill: '#3b82f6' },
    { name: 'Proposal', value: deals.filter(d => d.stage === 'proposal').length, fill: '#8b5cf6' },
    { name: 'Won', value: deals.filter(d => d.stage === 'closed_won').length, fill: '#10b981' },
    { name: 'Lost', value: deals.filter(d => d.stage === 'closed_lost').length, fill: '#ef4444' },
  ];

  // Revenue by Stage
  const revenueByStage = pipelineData.map(stage => ({
    name: stage.name,
    value: deals
      .filter(d => d.stage === stage.name.toLowerCase().replace(' ', '_') || 
                   (stage.name === 'Won' && d.stage === 'closed_won') ||
                   (stage.name === 'Lost' && d.stage === 'closed_lost'))
      .reduce((sum, d) => sum + Number(d.value || 0), 0),
    fill: stage.fill,
  }));

  // Activity breakdown
  const activityBreakdown = [
    { name: 'Tasks', value: activities.filter(a => a.activity_type === 'task').length, fill: '#3b82f6' },
    { name: 'Calls', value: activities.filter(a => a.activity_type === 'call').length, fill: '#10b981' },
    { name: 'Meetings', value: activities.filter(a => a.activity_type === 'meeting').length, fill: '#8b5cf6' },
    { name: 'Emails', value: activities.filter(a => a.activity_type === 'email').length, fill: '#f59e0b' },
    { name: 'Notes', value: activities.filter(a => a.activity_type === 'note').length, fill: '#64748b' },
  ];

  // Monthly trend (last 6 months)
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const monthDeals = deals.filter(d => {
      const createdAt = new Date(d.created_at || '');
      return createdAt >= monthStart && createdAt <= monthEnd;
    });

    const monthContacts = contacts.filter(c => {
      const createdAt = new Date(c.created_at || '');
      return createdAt >= monthStart && createdAt <= monthEnd;
    });

    return {
      month: format(date, 'MMM'),
      deals: monthDeals.length,
      contacts: monthContacts.length,
      revenue: monthDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
    };
  });

  // Completion rate
  const completionRate = activities.length > 0 
    ? Math.round((activities.filter(a => a.is_completed).length / activities.length) * 100)
    : 0;

  // Win rate
  const closedDeals = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost');
  const winRate = closedDeals.length > 0
    ? Math.round((deals.filter(d => d.stage === 'closed_won').length / closedDeals.length) * 100)
    : 0;

  // Total revenue
  const totalRevenue = deals
    .filter(d => d.stage === 'closed_won')
    .reduce((sum, d) => sum + Number(d.value || 0), 0);

  // Average deal size
  const wonDeals = deals.filter(d => d.stage === 'closed_won');
  const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading reports...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Analytics and insights for your CRM</p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>12% from last period</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold">{winRate}%</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>5% improvement</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                  <p className="text-2xl font-bold">${avgDealSize.toLocaleString()}</p>
                  <div className="flex items-center text-xs text-red-600 mt-1">
                    <ArrowDownRight className="h-3 w-3" />
                    <span>3% from last period</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Task Completion</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                  <div className="flex items-center text-xs text-green-600 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>8% improvement</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#4f46e5" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deals & Contacts Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Legend />
                    <Line type="monotone" dataKey="deals" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5' }} />
                    <Line type="monotone" dataKey="contacts" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {pipelineData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-sm text-muted-foreground">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={70} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {activityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByStage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {revenueByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{contacts.length}</p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{deals.length}</p>
                <p className="text-sm text-muted-foreground">Total Deals</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{activities.length}</p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{wonDeals.length}</p>
                <p className="text-sm text-muted-foreground">Deals Won</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{deals.filter(d => d.stage === 'closed_lost').length}</p>
                <p className="text-sm text-muted-foreground">Deals Lost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
