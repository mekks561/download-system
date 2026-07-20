import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserApiService } from '../services/UserApiService';
import { useToast } from './Toast';

const passwordChangeSchema = z.object({
  oldPassword: z.string().min(6, '密码至少6个字符'),
  newPassword: z.string()
    .min(6, '新密码至少6个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword'],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

interface PasswordStrength {
  level: number;
  label: string;
  color: string;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let level = 0;
  
  if (password.length >= 8) level++;
  if (password.length >= 12) level++;
  if (/[a-z]/.test(password)) level++;
  if (/[A-Z]/.test(password)) level++;
  if (/[0-9]/.test(password)) level++;
  if (/[^a-zA-Z0-9]/.test(password)) level++;

  const levels: PasswordStrength[] = [
    { level: 0, label: '无', color: '#9ca3af' },
    { level: 1, label: '非常弱', color: '#ef4444' },
    { level: 2, label: '弱', color: '#f97316' },
    { level: 3, label: '中等', color: '#eab308' },
    { level: 4, label: '强', color: '#84cc16' },
    { level: 5, label: '非常强', color: '#22c55e' },
    { level: 6, label: '极强', color: '#10b981' },
  ];

  return levels[Math.min(level, 6)];
};

interface PasswordChangeFormProps {
  onSuccess?: () => void;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');

  const passwordStrength = useMemo(() => {
    if (newPassword) {
      return getPasswordStrength(newPassword);
    }
    return { level: 0, label: '无', color: '#9ca3af' };
  }, [newPassword]);

  const handleSubmit = async (data: PasswordChangeFormData) => {
    setIsLoading(true);
    try {
      const response = await UserApiService.changePassword({
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });

      if (response.success) {
        showToast('密码修改成功，请重新登录', 'success');
        form.reset();
        onSuccess?.();
      } else {
        showToast(response.message || '密码修改失败', 'error');
      }
    } catch {
      showToast('密码修改失败，请稍后重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔐 修改密码</h2>
        <p style={styles.description}>定期更换密码可以保护账户安全</p>
      </div>

      <form style={styles.form} onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit(handleSubmit)();
      }}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>🔑</span>
            <span>当前密码</span>
          </label>
          <input
            type="password"
            style={{
              ...styles.formInput,
              ...(form.formState.errors.oldPassword ? styles.inputError : {}),
            }}
            {...form.register('oldPassword')}
            placeholder="请输入当前密码"
          />
          {form.formState.errors.oldPassword && (
            <span style={styles.errorMessage}>{form.formState.errors.oldPassword.message}</span>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>✨</span>
            <span>新密码</span>
          </label>
          <input
            type="password"
            style={{
              ...styles.formInput,
              ...(form.formState.errors.newPassword ? styles.inputError : {}),
            }}
            {...form.register('newPassword')}
            placeholder="请输入新密码"
          />
          {form.formState.errors.newPassword && (
            <span style={styles.errorMessage}>{form.formState.errors.newPassword.message}</span>
          )}

          {form.watch('newPassword') && (
            <div style={styles.strengthSection}>
              <div style={styles.strengthLabel}>
                <span>密码强度:</span>
                <span style={{ color: passwordStrength.color, fontWeight: '500' }}>
                  {passwordStrength.label}
                </span>
              </div>
              <div style={styles.strengthBarContainer}>
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <div
                    key={level}
                    style={{
                      ...styles.strengthBarSegment,
                      backgroundColor: level <= passwordStrength.level
                        ? passwordStrength.color
                        : '#e5e7eb',
                    }}
                  />
                ))}
              </div>
              <div style={styles.strengthHints}>
                <span style={styles.hintItem}>至少6位</span>
                <span style={styles.hintItem}>含大写字母</span>
                <span style={styles.hintItem}>含数字</span>
              </div>
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>✅</span>
            <span>确认新密码</span>
          </label>
          <input
            type="password"
            style={{
              ...styles.formInput,
              ...(form.formState.errors.confirmPassword ? styles.inputError : {}),
            }}
            {...form.register('confirmPassword')}
            placeholder="请再次输入新密码"
          />
          {form.formState.errors.confirmPassword && (
            <span style={styles.errorMessage}>{form.formState.errors.confirmPassword.message}</span>
          )}
        </div>

        <div style={styles.formActions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => form.reset()}
          >
            取消
          </button>
          <button type="submit" style={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <>
                <span style={styles.loadingSpinner}>🔄</span>
                修改中...
              </>
            ) : (
              '💾 修改密码'
            )}
          </button>
        </div>
      </form>

      <div style={styles.tipsSection}>
        <h4 style={styles.tipsTitle}>💡 安全提示</h4>
        <ul style={styles.tipsList}>
          <li>使用包含字母、数字和特殊字符的组合密码</li>
          <li>避免使用生日、姓名等个人信息作为密码</li>
          <li>定期更换密码，建议每90天更换一次</li>
          <li>不要在多个网站使用相同的密码</li>
        </ul>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  description: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  formInput: {
    padding: '12px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'monospace',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorMessage: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  },
  strengthSection: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  strengthLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  strengthBarContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px',
  },
  strengthBarSegment: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    transition: 'background-color 0.3s',
  },
  strengthHints: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  hintItem: {
    fontSize: '11px',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitBtn: {
    flex: 1,
    padding: '12px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  loadingSpinner: {
    animation: 'spin 1s linear infinite',
  },
  tipsSection: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6',
  },
  tipsTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e40af',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#3b82f6',
    listStyleType: 'disc',
  },
};

export default PasswordChangeForm;
