import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Phone, Mail, Calendar, FileText, CheckSquare, Clock, Filter, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Activity = Tables<'activities'>;
type ActivityType = 'task' | 'call' | 'meeting' | 'email' | 'note';

const activityTypes: { value: ActivityType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'task', label: 'Task', icon: CheckSquare, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'call', label: 'Call', icon: Phone, color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { value: 'note', label: 'Note', icon: FileText, color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
];

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  2: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'High', color: 'bg-red-100 text-red-700' },
};

export default function Activities() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [form, setForm] = useState({
    title: '',
    description: '',
    activity_type: 'task' as ActivityType,
    priority: 2,
    due_date: '',
  });

  const fetchActivities = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setActivities((data as Activity[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [tenantId]);

  const handleCreate = async () => {
    if (!tenantId || !user) return;
    const { error } = await supabase.from('activities').insert({
      title: form.title,
      description: form.description || null,
      activity_type: form.activity_type,
      priority: form.priority,
      due_date: form.due_date || null,
      tenant_id: tenantId,
      owner_id: user.id,
      is_completed: false,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Activity created!' });
      setDialogOpen(false);
      resetForm();
      fetchActivities();
    }
  };

  const handleUpdate = async () => {
    if (!editingActivity) return;
    const { error } = await supabase
      .from('activities')
      .update({
        title: form.title,
        description: form.description || null,
        activity_type: form.activity_type,
        priority: form.priority,
        due_date: form.due_date || null,
      })
      .eq('activity_id', editingActivity.activity_id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Activity updated!' });
      setDialogOpen(false);
      setEditingActivity(null);
      resetForm();
      fetchActivities();
    }
  };

  const handleDelete = async (activityId: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('activity_id', activityId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Activity deleted!' });
      fetchActivities();
    }
  };

  const toggleComplete = async (activity: Activity) => {
    const { error } = await supabase
      .from('activities')
      .update({
        is_completed: !activity.is_completed,
        completed_at: !activity.is_completed ? new Date().toISOString() : null,
      })
      .eq('activity_id', activity.activity_id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchActivities();
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', activity_type: 'task', priority: 2, due_date: '' });
  };

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity);
    setForm({
      title: activity.title,
      description: activity.description || '',
      activity_type: activity.activity_type,
      priority: activity.priority || 2,
      due_date: activity.due_date ? activity.due_date.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const filteredActivities = activities.filter(a => {
    if (filterType !== 'all' && a.activity_type !== filterType) return false;
    if (filterStatus === 'pending' && a.is_completed) return false;
    if (filterStatus === 'completed' && !a.is_completed) return false;
    return true;
  });

  const pendingCount = activities.filter(a => !a.is_completed).length;
  const completedCount = activities.filter(a => a.is_completed).length;
  const overdueCount = activities.filter(a => !a.is_completed && a.due_date && new Date(a.due_date) < new Date()).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Activities</h1>
            <p className="text-muted-foreground">Track tasks, calls, meetings, and more</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingActivity(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Activity</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingActivity ? 'Edit Activity' : 'Create New Activity'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Activity title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.activity_type}
                    onValueChange={(v) => setForm({ ...form, activity_type: v as ActivityType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={String(form.priority)}
                    onValueChange={(v) => setForm({ ...form, priority: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Add notes or details..."
                    rows={3}
                  />
                </div>
                <Button onClick={editingActivity ? handleUpdate : handleCreate} className="w-full">
                  {editingActivity ? 'Update Activity' : 'Create Activity'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{activities.length}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                </div>
                <CheckSquare className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                </div>
                <Clock className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as ActivityType | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'pending' | 'completed')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activities List */}
        <Card>
          <CardHeader>
            <CardTitle>All Activities ({filteredActivities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No activities found</div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => {
                  const typeInfo = activityTypes.find(t => t.value === activity.activity_type)!;
                  const TypeIcon = typeInfo.icon;
                  const isOverdue = !activity.is_completed && activity.due_date && new Date(activity.due_date) < new Date();

                  return (
                    <div
                      key={activity.activity_id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border bg-card transition-colors hover:bg-accent/50",
                        activity.is_completed && "opacity-60"
                      )}
                    >
                      <Checkbox
                        checked={activity.is_completed || false}
                        onCheckedChange={() => toggleComplete(activity)}
                      />
                      <div className={cn("p-2 rounded-lg border", typeInfo.color)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium",
                          activity.is_completed && "line-through text-muted-foreground"
                        )}>
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={priorityLabels[activity.priority || 2].color}>
                        {priorityLabels[activity.priority || 2].label}
                      </Badge>
                      {activity.due_date && (
                        <div className={cn(
                          "text-sm flex items-center gap-1",
                          isOverdue ? "text-red-600" : "text-muted-foreground"
                        )}>
                          <Clock className="h-3 w-3" />
                          {format(new Date(activity.due_date), 'MMM d')}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(activity)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(activity.activity_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
