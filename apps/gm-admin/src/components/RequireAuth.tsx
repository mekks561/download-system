import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../store/useAuthStore';

/** 未登录统一跳 /login（token 失效时请求层会清空 store，此处自动重渲染重定向） */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
