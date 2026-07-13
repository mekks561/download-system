import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Auth from '../components/Auth';
import { User } from '../services/AuthService';
import { useAppStore } from '../store';
import SocketService from '../services/socketService';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAppStore();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isAuthenticated && user && window.location.pathname === '/login') {
      void navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleAuthSuccess = async (user: User) => {
    setError('');
    login(user);

    const token = localStorage.getItem('token');
    if (token) {
      SocketService.getInstance().connect(token);
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    void navigate('/', { replace: true });
  };

  return (
    <div>
      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}
      <Auth onAuthSuccess={(user) => void handleAuthSuccess(user)} />
    </div>
  );
};

export default LoginPage;