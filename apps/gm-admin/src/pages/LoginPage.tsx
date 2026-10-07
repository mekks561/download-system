import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GmLoginSchema, type GmLogin } from '@dm/shared';
import * as gm from '../services/gm';
import { errorText } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '../components/ui';

/** GM 登录页（独立页面，不进主布局）；成功后 token 存 sessionStorage 并跳首页 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GmLogin>({ resolver: zodResolver(GmLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');
    try {
      const result = await gm.login(values.username, values.password);
      login(result.token, result.gmUser);
      void navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(errorText(error));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>GM 管理后台</CardTitle>
          <CardDescription>请使用 GM 账号登录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" autoComplete="username" {...register('username')} />
              {errors.username && (
                <p className="text-sm text-error-600">{errors.username.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>
            {submitError && (
              <p role="alert" className="rounded-md bg-error-50 px-3 py-2 text-sm text-error-600">
                {submitError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
