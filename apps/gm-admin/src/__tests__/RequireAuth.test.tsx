import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import RequireAuth from '../components/RequireAuth';
import { useAuthStore } from '../store/useAuthStore';

function renderGuard(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>登录页</div>} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <div>受保护内容</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({ token: null, gmUser: null });
  });

  it('未登录：重定向到 /login，不渲染 children', () => {
    renderGuard('/');
    expect(screen.getByText('登录页')).toBeInTheDocument();
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument();
  });

  it('已登录：渲染 children，不跳转', () => {
    useAuthStore.setState({ token: 'gm-token', gmUser: { id: 1, username: 'gmroot', role: 'admin' } });
    renderGuard('/');
    expect(screen.getByText('受保护内容')).toBeInTheDocument();
    expect(screen.queryByText('登录页')).not.toBeInTheDocument();
  });
});
