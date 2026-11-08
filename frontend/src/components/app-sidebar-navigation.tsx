import { Link, useLocation } from "react-router-dom";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Clock,
  Target,
  MessageSquare,
  Trophy,
  Settings,
  Award,
  Wallet,
  FileText,
  Shield,
} from 'lucide-react';
import { AppLogo } from './app-logo';
import { Separator } from './ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/', labelKey: 'nav.dashboard', icon: Clock },
  { href: '/emotions', labelKey: 'nav.emotions', icon: LayoutDashboard },
  { href: '/goals', labelKey: 'nav.goals', icon: Target },
  { href: '/budgets', labelKey: 'nav.budgets', icon: Wallet },
  { href: '/reports', labelKey: 'nav.reports', icon: FileText },
  { href: '/admin/panel', labelKey: 'nav.admin', icon: Shield, adminOnly: true },
  { href: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { href: '/challenges', labelKey: 'nav.challenges', icon: Trophy },
  { href: '/achievements', labelKey: 'nav.achievements', icon: Award },
];

const bottomNavItems = [
  { href: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function AppSidebarNavigation() {
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const canAccessAdminPanel =
    user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'viewer_admin';
  const filteredNavItems = canAccessAdminPanel
    ? navItems.filter((item) => item.adminOnly)
    : navItems.filter((item) => !item.adminOnly);
  const isItemActive = (href: string) =>
    href === '/' ? location.pathname === href : location.pathname.startsWith(href);

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <AppLogo className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          <span className="text-base sm:text-lg font-semibold group-data-[collapsible=icon]:hidden">
            EmotionFlow
          </span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent className="flex-grow px-0">
        <SidebarMenu className="w-full">
          {filteredNavItems.map((item) => (
            <SidebarMenuItem key={item.href} className="w-full">
              <SidebarMenuButton
                asChild
                isActive={isItemActive(item.href)}
                className="group relative h-14 min-h-[3.25rem] w-full overflow-hidden rounded-xl border border-transparent px-3 pr-6 text-lg md:h-11 md:min-h-0 md:text-sm text-sidebar-foreground/80 transition-all duration-300 hover:bg-white/[0.04] hover:text-sidebar-foreground data-[active=true]:border-white/10 data-[active=true]:bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(99,102,241,0.20)_55%,rgba(79,70,229,0.45)_100%)] data-[active=true]:text-white data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(79,70,229,0.38)]"
              >
                <Link to={item.href} className="flex w-full min-w-0 items-center gap-3">
                  <span className="pointer-events-none absolute inset-[1px] rounded-[10px] opacity-0 transition-opacity duration-300 group-data-[active=true]:opacity-100 bg-[radial-gradient(circle_at_18%_50%,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_90%_50%,rgba(129,140,248,0.35),transparent_35%)]" />
                  <item.icon className="h-6 w-6 shrink-0 transition-colors md:h-4 md:w-4 group-data-[active=true]:text-white" />
                  <span className="flex-1 min-w-0 text-lg md:text-sm">{t(item.labelKey)}</span>
                  <span className="pointer-events-none absolute right-2 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-indigo-300/0 transition-all duration-300 group-data-[active=true]:bg-indigo-300 group-data-[active=true]:shadow-[0_0_14px_rgba(129,140,248,1)] group-data-[collapsible=icon]:hidden" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="!p-0 max-md:mb-[18px] md:mb-0 shrink-0">
        <SidebarMenu className="w-full">
          {bottomNavItems.map((item) => (
            <SidebarMenuItem key={item.href} className="w-full">
              <SidebarMenuButton
                asChild
                isActive={isItemActive(item.href)}
                className="group relative h-14 min-h-[3.25rem] w-full overflow-hidden rounded-xl border border-transparent px-3 pr-6 text-lg md:h-11 md:min-h-0 md:text-sm text-sidebar-foreground/80 transition-all duration-300 hover:bg-white/[0.04] hover:text-sidebar-foreground data-[active=true]:border-white/10 data-[active=true]:bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_0%,rgba(99,102,241,0.20)_55%,rgba(79,70,229,0.45)_100%)] data-[active=true]:text-white data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.06),0_12px_28px_rgba(79,70,229,0.38)]"
              >
                <Link to={item.href} className="flex w-full min-w-0 items-center gap-3">
                  <span className="pointer-events-none absolute inset-[1px] rounded-[10px] opacity-0 transition-opacity duration-300 group-data-[active=true]:opacity-100 bg-[radial-gradient(circle_at_18%_50%,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_90%_50%,rgba(129,140,248,0.35),transparent_35%)]" />
                  <item.icon className="h-6 w-6 shrink-0 transition-colors md:h-4 md:w-4 group-data-[active=true]:text-white" />
                  <span className="flex-1 min-w-0 text-lg md:text-sm">{t(item.labelKey)}</span>
                  <span className="pointer-events-none absolute right-2 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-indigo-300/0 transition-all duration-300 group-data-[active=true]:bg-indigo-300 group-data-[active=true]:shadow-[0_0_14px_rgba(129,140,248,1)] group-data-[collapsible=icon]:hidden" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
