import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function Reports() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Analytics and insights</p></div>
        <Card>
          <CardHeader><CardTitle>Coming Soon</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Detailed reports coming soon</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
