import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AuthService, User } from '../services/AuthService';
import { loginSchema, registerSchema, LoginFormData, RegisterFormData } from '../validation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/shadcn';
import { Button } from './ui/shadcn';
import { Input } from './ui/shadcn';
import { Label } from './ui/shadcn';
import { Alert, AlertDescription } from './ui/shadcn';

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

  const emailError = isLogin ? loginForm.formState.errors.email : registerForm.formState.errors.email;
  const passwordError = isLogin ? loginForm.formState.errors.password : registerForm.formState.errors.password;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/4 left-1/4 text-4xl opacity-20 float-animation">🌸</div>
        <div className="absolute top-1/3 right-1/4 text-3xl opacity-20 float-animation-delay-1">✨</div>
        <div className="absolute bottom-1/4 left-1/5 text-3xl opacity-20 float-animation-delay-2">🦄</div>
        <div className="absolute bottom-1/3 right-1/3 text-3xl opacity-20 float-animation-delay-3">💫</div>
        <div className="absolute top-1/2 left-1/2 text-2xl opacity-15 sparkle-animation">🌈</div>
        <div className="absolute top-1/4 right-1/3 text-2xl opacity-15 sparkle-animation" style={{animationDelay: '0.7s'}}>⭐</div>
        <div className="absolute bottom-1/5 right-1/5 text-2xl opacity-15 sparkle-animation" style={{animationDelay: '1.2s'}}>🎀</div>
      </div>
      
      <Card className="w-full max-w-md relative z-10 bg-white/80 backdrop-blur-md kawaii-shadow border-pink-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            <span className="mr-2 text-3xl bounce-soft">🔐</span>
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccount')}
            <span className="ml-2 text-xl bounce-soft">🌸</span>
          </CardTitle>
          <CardDescription className="text-gray-500">
            {isLogin ? t('auth.loginPrompt') : t('auth.registerPrompt')} ✨
          </CardDescription>
        </CardHeader>

        <CardContent>
          {message && (
            <Alert variant={messageType === 'success' ? 'success' : 'destructive'} className="mb-6">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void (isLogin ? handleLoginSubmit(e) : handleRegisterSubmit(e));
            }}
          >
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input
                  type="text"
                  id="username"
                  placeholder={t('auth.usernamePlaceholder')}
                  {...registerForm.register('username')}
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                type="email"
                id="email"
                placeholder={t('auth.emailPlaceholder')}
                {...(isLogin ? loginForm.register('email') : registerForm.register('email'))}
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                type="password"
                id="password"
                placeholder={t('auth.passwordPlaceholder')}
                {...(isLogin ? loginForm.register('password') : registerForm.register('password'))}
              />
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError.message}</p>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  {...registerForm.register('confirmPassword')}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('auth.processing') : (isLogin ? t('auth.login') : t('auth.register'))}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-gray-600">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <Button
              type="button"
              variant="link"
              className="px-1"
              onClick={handleSwitchMode}
            >
              {isLogin ? t('auth.registerNow') : t('auth.loginNow')}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
