import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare } from 'lucide-react';

export default function Activities() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Activities</h1><p className="text-muted-foreground">Track tasks, calls, and meetings</p></div>
        <Card>
          <CardHeader><CardTitle>Coming Soon</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center py-12">
            <CheckSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Activity management is being built</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
