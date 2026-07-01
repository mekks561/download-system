import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AuthService, User } from '../services/AuthService';
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from '../validation';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authService = AuthService.getInstance();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleLoginSubmit = loginForm.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setMessage('');
    const response = await authService.login(data.email, data.password);

    if (response.success && response.user) {
      setMessage(t('auth.loginSuccess'));
      setMessageType('success');
      onAuthSuccess(response.user);
    } else {
      setMessage(response.message || t('auth.loginFailed'));
      setMessageType('error');
    }
    setIsSubmitting(false);
  });

  const handleRegisterSubmit = registerForm.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setMessage('');
    const response = await authService.register(data.username, data.email, data.password);

    if (response.success && response.user) {
      const user = response.user;
      setMessage(t('auth.registerSuccess'));
      setMessageType('success');
      setTimeout(() => {
        onAuthSuccess(user);
      }, 1000);
    } else {
      setMessage(response.message || t('auth.loginFailed'));
      setMessageType('error');
    }
    setIsSubmitting(false);
  });

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setMessage('');
    if (isLogin) {
      registerForm.reset();
    } else {
      loginForm.reset();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">
            <span className="title-icon">🔐</span>
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
          </h2>
          <p className="auth-subtitle">
            {isLogin ? t('auth.loginPrompt') : t('auth.registerPrompt')}
          </p>
        </div>

        {message && (
          <div className={`auth-message ${messageType}`}>
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={(e) => {
        e.preventDefault();
        void (isLogin ? handleLoginSubmit(e) : handleRegisterSubmit(e));
      }}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                type="text"
                id="username"
                className={`form-input ${registerForm.formState.errors.username ? 'input-error' : ''}`}
                placeholder={t('auth.usernamePlaceholder')}
                {...registerForm.register('username')}
              />
              {registerForm.formState.errors.username && (
                <span className="error-message">{registerForm.formState.errors.username.message}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              className={`form-input ${isLogin ? (loginForm.formState.errors.email ? 'input-error' : '') : (registerForm.formState.errors.email ? 'input-error' : '')}`}
              placeholder={t('auth.emailPlaceholder')}
              {...(isLogin ? loginForm.register('email') : registerForm.register('email'))}
            />
            {(isLogin ? loginForm.formState.errors.email : registerForm.formState.errors.email) && (
              <span className="error-message">{(isLogin ? loginForm.formState.errors.email : registerForm.formState.errors.email)?.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              className={`form-input ${isLogin ? (loginForm.formState.errors.password ? 'input-error' : '') : (registerForm.formState.errors.password ? 'input-error' : '')}`}
              placeholder={t('auth.passwordPlaceholder')}
              {...(isLogin ? loginForm.register('password') : registerForm.register('password'))}
            />
            {(isLogin ? loginForm.formState.errors.password : registerForm.formState.errors.password) && (
              <span className="error-message">{(isLogin ? loginForm.formState.errors.password : registerForm.formState.errors.password)?.message}</span>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                id="confirmPassword"
                className={`form-input ${registerForm.formState.errors.confirmPassword ? 'input-error' : ''}`}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                {...registerForm.register('confirmPassword')}
              />
              {registerForm.formState.errors.confirmPassword && (
                <span className="error-message">{registerForm.formState.errors.confirmPassword.message}</span>
              )}
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={isSubmitting}>
            {isSubmitting ? t('auth.processing') : (isLogin ? t('auth.login') : t('auth.register'))}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          <button
            type="button"
            className="switch-btn"
            onClick={handleSwitchMode}
          >
            {isLogin ? t('auth.registerNow') : t('auth.loginNow')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;