import React, { useMemo } from 'react';
import { Button, Input, Label } from '../../components/ui/shadcn';
import { OnboardingStep2Schema } from '@dm/shared';
import {
  PASSWORD_STRENGTH_LABELS,
  passwordStrength,
  useOnboardingStore,
  type AdminField,
} from '../../store/useOnboardingStore';

/**
 * Step 2：创建管理员账号
 *
 * 校验用 `@dm/shared` 的 OnboardingStep2Schema（与后端同一份契约），
 * 错误信息即为 schema 里的中文文案，边填边清错。
 */
const STRENGTH_COLORS = ['bg-gray-300', 'bg-red-400', 'bg-amber-400', 'bg-lime-500', 'bg-green-500'];

const Field: React.FC<{
  id: AdminField;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}> = ({ id, label, type = 'text', placeholder, autoComplete }) => {
  const value = useOnboardingStore((s) => s.admin[id]);
  const error = useOnboardingStore((s) => s.fieldErrors[id]);
  const setAdminField = useOnboardingStore((s) => s.setAdminField);

  return (
    <div className="space-y-2">
      <Label htmlFor={`onboarding-${id}`}>{label}</Label>
      <Input
        id={`onboarding-${id}`}
        data-testid={`onboarding-${id}`}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(e) => setAdminField(id, e.target.value)}
      />
      {error && (
        <p className="text-sm text-red-500" data-testid={`onboarding-${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
};

const Step2Admin: React.FC = () => {
  const admin = useOnboardingStore((s) => s.admin);
  const password = admin.password;
  const submitAdmin = useOnboardingStore((s) => s.submitAdmin);
  const back = useOnboardingStore((s) => s.back);
  const submitting = useOnboardingStore((s) => s.submitting);
  const error = useOnboardingStore((s) => s.error);

  const strength = passwordStrength(password);

  // 与提交时（submitAdmin → validateAdmin）完全同一套 Zod 规则实时判定，
  // 再加上「两次密码一致」这条纯 UI 约束；强度条只负责展示，不另立规则。
  const canSubmit = useMemo(() => {
    const parsed = OnboardingStep2Schema.safeParse({
      username: admin.username,
      email: admin.email,
      password: admin.password,
    });
    return parsed.success && admin.password === admin.confirmPassword;
  }, [admin.username, admin.email, admin.password, admin.confirmPassword]);

  return (
    <div className="space-y-5" data-testid="onboarding-step-2">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-800">创建管理员账号</h2>
        <p className="text-sm text-gray-500">该账号拥有系统全部管理权限，请妥善保管密码。</p>
      </div>

      <Field id="username" label="用户名" placeholder="3-20 位字母、数字或下划线" autoComplete="username" />
      <Field id="email" label="邮箱" type="email" placeholder="admin@example.com" autoComplete="email" />

      <div className="space-y-2">
        <Field id="password" label="密码" type="password" placeholder="至少 8 位" autoComplete="new-password" />
        {password && (
          <div className="flex items-center gap-2" data-testid="onboarding-password-strength">
            <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all ${STRENGTH_COLORS[strength]}`}
                style={{ width: `${(strength / 4) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{PASSWORD_STRENGTH_LABELS[strength]}</span>
          </div>
        )}
      </div>

      <Field
        id="confirmPassword"
        label="确认密码"
        type="password"
        placeholder="再次输入密码"
        autoComplete="new-password"
      />

      {error && (
        <div className="auth-error" data-testid="onboarding-error">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={back} disabled={submitting}>
          返回
        </Button>
        <Button
          className="flex-1"
          onClick={() => void submitAdmin()}
          disabled={submitting || !canSubmit}
          data-testid="onboarding-create-admin"
        >
          {submitting ? '创建中…' : '创建并继续'}
        </Button>
      </div>
    </div>
  );
};

export default Step2Admin;
