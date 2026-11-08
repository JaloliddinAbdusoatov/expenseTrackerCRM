import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebarNavigation } from './app-sidebar-navigation';
import { AppLogo } from './app-logo';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';
import { PanelLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isSettingsArea = location.pathname === '/settings' || location.pathname.startsWith('/settings/');

  const topTabs = (
    <div className="rounded-full border bg-background/60 p-1 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <Link
          to="/settings"
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            location.pathname === '/settings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Settings
        </Link>
        <Link
          to="/settings/cards"
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            location.pathname.startsWith('/settings/cards')
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Cards SOON
        </Link>
      </div>
    </div>
  );

  const mobileTopTabs = (
    <div className="rounded-full border bg-background/60 p-1 backdrop-blur-sm w-fit">
      <div className="flex items-center gap-1">
        <Link
          to="/settings"
          className={cn(
            'rounded-full px-4 py-2.5 min-h-[2.75rem] text-sm font-medium transition-colors inline-flex items-center justify-center',
            location.pathname === '/settings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Settings
        </Link>
        <Link
          to="/settings/cards"
          className={cn(
            'rounded-full px-4 py-2.5 min-h-[2.75rem] text-sm font-medium transition-colors inline-flex items-center justify-center',
            location.pathname.startsWith('/settings/cards')
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Cards
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <div className="flex min-h-screen w-full flex-col">
          <header className="dotted-nav-bg sticky top-0 flex h-12 min-h-[3.25rem] sm:h-16 items-center gap-3 border-b backdrop-blur-sm px-3 sm:px-6 z-30">
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 size-12 md:hidden border-border"
              >
                <PanelLeft className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <div className="flex items-center gap-2 font-semibold">
              <AppLogo className="h-6 w-6 text-primary" />
              <span>EmotionFlow</span>
            </div>
          </header>
          {isSettingsArea && (
            <div className="dotted-nav-bg border-b px-3 py-1 max-md:-mb-px">
              {mobileTopTabs}
            </div>
          )}
          <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
            {children}
          </main>
        </div>
        <SheetContent side="left" className="flex flex-col p-0 w-[280px]">
          <AppSidebarNavigation />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar className="border-r" collapsible="icon" variant="sidebar">
        <AppSidebarNavigation />
      </Sidebar>
      <div className="flex-1 overflow-auto w-full min-w-0">
        <header className="dotted-nav-bg sticky top-0 z-10 flex h-14 sm:h-16 items-center justify-between border-b px-4 sm:px-6 backdrop-blur-sm w-full">
          <SidebarTrigger />
          {isSettingsArea && topTabs}
        </header>
        <main className="w-full min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
