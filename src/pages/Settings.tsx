import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Manage your organization</p></div>
        <Card>
          <CardHeader><CardTitle>Organization Settings</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center py-12">
            <SettingsIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Admin settings coming soon</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
