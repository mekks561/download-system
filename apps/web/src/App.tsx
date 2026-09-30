import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router';
import './i18n';
import { Layout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthService } from './services/AuthService';
import { shouldOnboard } from './services/onboardingGate';
import { useAppStore } from './store';
import { TooltipProvider } from './components/ui/shadcn';
import { ToastProvider } from './components/Toast';
import { NotificationProvider } from './services/notificationService';
import { SearchHistoryProvider } from './services/searchHistoryService';
import { SpeedLimitProvider } from './services/speedLimitService';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Downloads = lazy(() => import('./pages/Downloads'));
const Uploads = lazy(() => import('./pages/Uploads'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Sharing = lazy(() => import('./pages/Sharing'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const ErrorPage = lazy(() => import('./pages/ErrorPage'));
const Files = lazy(() => import('./pages/Files'));
const Profile = lazy(() => import('./pages/Profile'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SharePreview = lazy(() => import('./pages/SharePreview'));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'));

const PageLoader: React.FC = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>加载中...</p>
  </div>
);

/**
 * S1 首次运行重定向：命中「未初始化」时把用户带到 /onboarding。
 *
 * 必须在 BrowserRouter 内部才能拿到 navigate，故单独抽成组件。
 * 后端不可用时 shouldOnboard 会抛错并被吞掉 → needsOnboarding 保持 false，
 * 不会因为后端挂了就把用户锁在向导里。
 */
const FirstRunRedirect: React.FC<{ needsOnboarding: boolean }> = ({ needsOnboarding }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (needsOnboarding && location.pathname !== '/onboarding') {
      void navigate('/onboarding', { replace: true });
    }
  }, [needsOnboarding, location.pathname, navigate]);

  return null;
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const authService = AuthService.getInstance();
  const { login, logout, isAuthenticated } = useAppStore();

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        const user = await authService.getProfile();
        if (user) {
          login(user);
        } else {
          logout();
        }
      } else {
        logout();
      }
      setLoading(false);
    };
    void checkAuth();
  }, [authService, login, logout]);

  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        setNeedsOnboarding(await shouldOnboard());
      } catch {
        // 后端未就绪时不做引导判定，避免把用户锁在向导里
        setNeedsOnboarding(false);
      }
    };
    void checkFirstRun();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <NotificationProvider>
            <SearchHistoryProvider>
              <SpeedLimitProvider>
                <TooltipProvider>
                  <Suspense fallback={<PageLoader />}>
                    <FirstRunRedirect needsOnboarding={needsOnboarding} />
                    <Routes>
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
              <Route path="/share/:token" element={<SharePreview />} />
              <Route element={<Layout />}>
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
                <Route path="/uploads" element={<ProtectedRoute><Uploads /></ProtectedRoute>} />
                <Route path="/stats" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
                <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
                <Route path="/sharing" element={<ProtectedRoute><Sharing /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="*" element={<ErrorPage />} />
              </Route>
            </Routes>
                    </Suspense>
                  </TooltipProvider>
                </SpeedLimitProvider>
              </SearchHistoryProvider>
            </NotificationProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
