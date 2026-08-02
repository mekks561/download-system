import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import './i18n';
import { Layout } from './components/layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthService } from './services/AuthService';
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

const PageLoader: React.FC = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>加载中...</p>
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
                    <Routes>
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
