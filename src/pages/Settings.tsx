import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Building2, Users, Shield, Bell, Palette, User, Mail, Phone, Crown, UserCog, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type UserRole = Tables<'user_roles'>;
type Tenant = Tables<'tenants'>;

interface TeamMember extends Profile {
  role?: string;
}

const roleIcons: Record<string, React.ElementType> = {
  admin: Crown,
  manager: UserCog,
  sales_agent: UserCheck,
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  sales_agent: 'bg-green-100 text-green-700 border-green-200',
};

export default function Settings() {
  const { tenantId, profile, user, role } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
  });

  // Organization form
  const [orgForm, setOrgForm] = useState({
    name: '',
    subdomain: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email_deals: true,
    email_activities: true,
    email_team: false,
    browser_push: true,
  });

  useEffect(() => {
    if (tenantId && profile) {
      fetchData();
      setProfileForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
      });
    }
  }, [tenantId, profile]);

  const fetchData = async () => {
    // Fetch tenant info
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (tenantData) {
      setTenant(tenantData);
      setOrgForm({
        name: tenantData.name || '',
        subdomain: tenantData.subdomain || '',
      });
    }

    // Fetch team members with roles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('tenant_id', tenantId);

    if (profiles && roles) {
      const membersWithRoles = profiles.map(p => ({
        ...p,
        role: roles.find(r => r.user_id === p.user_id)?.role || 'sales_agent',
      }));
      setTeamMembers(membersWithRoles);
    }

    setLoading(false);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileForm.full_name,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated!' });
    }
    setSaving(false);
  };

  const handleUpdateOrganization = async () => {
    if (!tenantId || role !== 'admin') return;
    setSaving(true);

    const { error } = await supabase
      .from('tenants')
      .update({
        name: orgForm.name,
        subdomain: orgForm.subdomain,
      })
      .eq('tenant_id', tenantId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Organization updated!' });
    }
    setSaving(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAdmin = role === 'admin';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and organization</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {getInitials(profileForm.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{profileForm.full_name || 'Unknown User'}</h3>
                    <p className="text-muted-foreground">{profileForm.email}</p>
                    <Badge variant="outline" className={roleColors[role || 'sales_agent']}>
                      {role?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={profileForm.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>

                <Button onClick={handleUpdateProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  {isAdmin ? 'Manage your organization settings' : 'View organization information'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Organization Name</Label>
                    <Input
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      placeholder="Organization name"
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subdomain</Label>
                    <Input
                      value={orgForm.subdomain || ''}
                      onChange={(e) => setOrgForm({ ...orgForm, subdomain: e.target.value })}
                      placeholder="your-company"
                      disabled={!isAdmin}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <Button onClick={handleUpdateOrganization} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}

                {!isAdmin && (
                  <p className="text-sm text-muted-foreground">
                    Only admins can modify organization settings
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <p className="font-medium text-red-700">Delete Organization</p>
                    <p className="text-sm text-red-600">This will permanently delete all data</p>
                  </div>
                  <Button variant="destructive" disabled={!isAdmin}>
                    Delete Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>{teamMembers.length} members in your organization</CardDescription>
                </div>
                {isAdmin && (
                  <Button>
                    <Users className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => {
                    const RoleIcon = roleIcons[member.role || 'sales_agent'] || UserCheck;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={roleColors[member.role || 'sales_agent']}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {member.role?.replace('_', ' ')}
                          </Badge>
                          {member.user_id === user?.id && (
                            <Badge variant="secondary">You</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Understanding access levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Admin</p>
                      <p className="text-sm text-muted-foreground">
                        Full access to all features, can manage team members, organization settings, and billing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <UserCog className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Manager</p>
                      <p className="text-sm text-muted-foreground">
                        Can view reports, manage team activities, and oversee deals and contacts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <UserCheck className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Sales Agent</p>
                      <p className="text-sm text-muted-foreground">
                        Can manage their own contacts, deals, and activities
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Choose what updates you receive via email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Deal Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when deals are created, updated, or closed
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_deals}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_deals: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Activity Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders for upcoming tasks and meetings
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_activities}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_activities: checked })}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Team Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when team members are added or roles change
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_team}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_team: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>Browser notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Browser Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive real-time notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={notifications.browser_push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, browser_push: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button>Save Notification Preferences</Button>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
