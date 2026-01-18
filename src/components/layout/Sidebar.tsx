import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Target,
  CheckSquare,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Deals', href: '/deals', icon: Target },
  { name: 'Activities', href: '/activities', icon: CheckSquare },
  { name: 'Reports', href: '/reports', icon: FileText },
];

const adminNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 overflow-hidden',
        collapsed ? 'w-20' : 'w-72'
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute top-20 -left-20 w-40 h-40 rounded-full bg-primary/20 blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-40 -right-20 w-32 h-32 rounded-full bg-accent/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      
      <div className="flex h-full flex-col relative z-10">
        {/* Logo */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-sidebar-border/50">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" />
                <Sparkles className="h-5 w-5 text-white relative z-10" />
              </div>
              <div>
                <span className="font-bold text-lg text-sidebar-foreground tracking-tight">TenantCRM</span>
                <p className="text-[10px] text-sidebar-foreground/50 font-medium tracking-widest uppercase">Pro Suite</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl transition-all duration-200",
              collapsed && "mx-auto"
            )}
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto scrollbar-thin">
          {navigation.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'sidebar-item',
                  isActive && 'sidebar-item-active',
                  collapsed && 'justify-center px-3'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
                {!collapsed && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}

          {role === 'admin' && (
            <>
              <div className="my-6 mx-3 border-t border-sidebar-border/30" />
              <p className={cn(
                "text-[10px] text-sidebar-foreground/40 font-semibold tracking-widest uppercase px-4 mb-3",
                collapsed && "hidden"
              )}>
                Admin
              </p>
              {adminNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'sidebar-item',
                      isActive && 'sidebar-item-active',
                      collapsed && 'justify-center px-3'
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                      isActive && "scale-110"
                    )} />
                    {!collapsed && <span className="font-medium">{item.name}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="border-t border-sidebar-border/30 p-4">
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/30 backdrop-blur-sm transition-all duration-200 hover:bg-sidebar-accent/50',
            collapsed && 'justify-center p-2'
          )}>
            <div className="relative">
              <Avatar className="h-10 w-10 ring-2 ring-sidebar-primary/30 ring-offset-2 ring-offset-sidebar-background">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-sidebar-background" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate capitalize">
                  {role?.replace('_', ' ') || 'Member'}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
