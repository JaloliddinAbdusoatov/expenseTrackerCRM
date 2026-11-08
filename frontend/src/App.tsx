import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/app-layout";
import AuthPage from "./components/AuthPage";
import DashboardPage from "./pages/Dashboard";
import GoalsPage from "./pages/Goals";
import EmotionsPage from "./pages/Emotions";
import ChatPage from "./pages/Chat";
import ChallengesPage from "./pages/Challenges";
import AchievementsPage from "./pages/Achievements";
import BudgetsPage from "./pages/Budgets";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import CardsPage from "./pages/Cards";
import AdminPage from "./pages/Admin";
import AdminLoginPage from "./pages/AdminLogin";
import AboutPage from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<AboutPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/panel" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const canAccessAdminPanel =
    user.role === 'admin' || user.role === 'superadmin' || user.role === 'viewer_admin';
  const isAdminAreaUser = canAccessAdminPanel;

  return (
    <AppLayout>
      <Routes>
        <Route path="/auth" element={<Navigate to={isAdminAreaUser ? "/admin/panel" : "/"} replace />} />
        <Route path="/signup" element={<Navigate to={isAdminAreaUser ? "/admin/panel" : "/"} replace />} />
        <Route path="/about" element={<Navigate to={isAdminAreaUser ? "/admin/panel" : "/"} replace />} />
        <Route path="/" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <DashboardPage />} />
        <Route path="/goals" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <GoalsPage />} />
        <Route path="/emotions" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <EmotionsPage />} />
        <Route path="/chat" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <ChatPage />} />
        <Route path="/challenges" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <ChallengesPage />} />
        <Route path="/achievements" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <AchievementsPage />} />
        <Route path="/budgets" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <BudgetsPage />} />
        <Route path="/reports" element={isAdminAreaUser ? <Navigate to="/admin/panel" replace /> : <ReportsPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/panel"
          element={canAccessAdminPanel ? <AdminPage /> : <Navigate to="/admin" replace />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/cards" element={<CardsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </TooltipProvider>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
