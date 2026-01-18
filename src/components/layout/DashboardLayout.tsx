import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { AIChatSidebar } from '@/components/chat/AIChatSidebar';
import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent blur-xl opacity-50 animate-pulse" />
            <div className="relative bg-background rounded-full p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle mesh gradient background */}
      <div className="fixed inset-0 mesh-gradient opacity-50 pointer-events-none" />
      
      {/* Floating decorative orbs */}
      <div className="fixed top-20 right-20 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none animate-float" />
      <div className="fixed bottom-20 left-1/3 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl pointer-events-none animate-float" style={{ animationDelay: '5s' }} />
      
      <Sidebar />
      <main className="pl-72 min-h-screen relative z-10">
        <div className="p-8">{children}</div>
      </main>
      <AIChatSidebar />
    </div>
  );
}
