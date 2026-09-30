import React from 'react';
import { Link } from 'react-router';
import { useOnboardingStore } from '../store/useOnboardingStore';

/**
 * 初始密码提示条（S1 spec §3.5）
 *
 * 「跳过向导」时后端会生成一次性随机口令，这个提示条持续提醒用户改密，
 * 直到 `PasswordChangeForm` 改密成功后把标记置为 false。
 *
 * 之所以不用固定默认口令：v3.1.0 已移除 seed 里的硬编码弱口令，跳过向导同样
 * 不写死任何口令（详见 apps/api/src/utils/password.ts 的注释）。
 *
 * 状态从 store 订阅而不是在 effect 里读 localStorage —— 避免多余渲染，
 * 也让改密成功后无需等路由变化就立即消失。
 */
const PasswordWarningBanner: React.FC = () => {
  const visible = useOnboardingStore((s) => s.mustChangePassword);

  if (!visible) return null;

  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-3 md:px-6 py-2 text-sm text-amber-900 flex flex-wrap items-center gap-x-3 gap-y-1"
      data-testid="default-password-banner"
      role="status"
    >
      <span>⚠️ 当前账号仍在使用系统生成的初始密码，建议立即修改。</span>
      <Link to="/profile" className="underline font-medium hover:text-amber-700">
        去个人中心修改 →
      </Link>
    </div>
  );
};

export default PasswordWarningBanner;
