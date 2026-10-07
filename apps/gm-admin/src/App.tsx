import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import DownloadsPage from './pages/DownloadsPage';
import { useAuthStore } from './store/useAuthStore';

const LoginRoute: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/" replace /> : <LoginPage />;
};

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
