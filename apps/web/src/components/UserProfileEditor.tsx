import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppStore } from '../store';
import { UserApiService } from '../services/UserApiService';
import { useToast } from './Toast';

const profileEditorSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().refine(
    (val) => val === '' || /^1[3-9]\d{9}$/.test(val),
    { message: '请输入有效的手机号码' }
  ).optional(),
  bio: z.string().max(200, '个人简介最多200个字符').optional(),
});

type ProfileEditorFormData = z.infer<typeof profileEditorSchema>;

interface UserProfileEditorProps {
  onSave?: () => void;
}

const UserProfileEditor: React.FC<UserProfileEditorProps> = ({ onSave }) => {
  const { user, login } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const form = useForm<ProfileEditorFormData>({
    resolver: zodResolver(profileEditorSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      phone: '',
      bio: '',
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('图片大小不能超过5MB', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        compressImage(base64, 500, (compressed) => {
          setAvatarPreview(compressed);
          setUploadProgress(100);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = (base64: string, maxWidth: number, callback: (compressed: string) => void) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      } else {
        callback(base64);
      }
    };
    img.onerror = () => callback(base64);
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (data: ProfileEditorFormData) => {
    setIsLoading(true);
    try {
      const response = await UserApiService.updateProfile({
        username: data.username,
        email: data.email,
        phone: data.phone || undefined,
      });

      if (response.success && response.data) {
        login({
          ...response.data,
          id: String(response.data.id),
        });
        showToast('个人信息更新成功', 'success');
        onSave?.();
      } else {
        showToast(response.message || '更新失败', 'error');
      }
    } catch {
      showToast('更新失败，请稍后重试', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>👤 编辑个人资料</h2>
        <p style={styles.description}>管理您的个人信息和头像</p>
      </div>

      <div style={styles.avatarSection}>
        <div style={styles.avatarWrapper}>
          <div style={styles.avatarContainer}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="头像"
                style={styles.avatarImage}
              />
            ) : (
              <div style={styles.avatarPlaceholder}>
                <span style={styles.avatarIcon}>👤</span>
                <span style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={styles.uploadOverlay}>
                <div style={{ ...styles.uploadProgressBar, width: `${uploadProgress}%` }} />
              </div>
            )}

            <label style={styles.changeAvatarBtn} title="更换头像">
              📷
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </label>

            {avatarPreview && (
              <button
                style={styles.removeAvatarBtn}
                onClick={removeAvatar}
                title="移除头像"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <p style={styles.avatarHint}>支持 JPG、PNG 格式，最大 5MB</p>
      </div>

      <form style={styles.form} onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit(handleSubmit)();
      }}>
        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>👤</span>
            <span>用户名</span>
          </label>
          <input
            type="text"
            style={{
              ...styles.formInput,
              ...(form.formState.errors.username ? styles.inputError : {}),
            }}
            {...form.register('username')}
            placeholder="请输入用户名"
          />
          {form.formState.errors.username && (
            <span style={styles.errorMessage}>{form.formState.errors.username.message}</span>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>📧</span>
            <span>邮箱</span>
          </label>
          <input
            type="email"
            style={{
              ...styles.formInput,
              ...(form.formState.errors.email ? styles.inputError : {}),
            }}
            {...form.register('email')}
            placeholder="请输入邮箱地址"
          />
          {form.formState.errors.email && (
            <span style={styles.errorMessage}>{form.formState.errors.email.message}</span>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>📱</span>
            <span>手机号</span>
          </label>
          <input
            type="tel"
            style={{
              ...styles.formInput,
              ...(form.formState.errors.phone ? styles.inputError : {}),
            }}
            {...form.register('phone')}
            placeholder="请输入手机号码（选填）"
          />
          {form.formState.errors.phone && (
            <span style={styles.errorMessage}>{String(form.formState.errors.phone.message)}</span>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.formLabel}>
            <span>💬</span>
            <span>个人简介</span>
          </label>
          <textarea
            style={styles.textarea}
            {...form.register('bio')}
            placeholder="简单介绍一下自己（最多200字）"
            rows={3}
          />
          <div style={styles.textareaCount}>
            {form.watch('bio')?.length || 0}/200
          </div>
        </div>

        <div style={styles.formActions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => {
              form.reset({
                username: user?.username || '',
                email: user?.email || '',
                phone: '',
                bio: '',
              });
              removeAvatar();
            }}
          >
            取消
          </button>
          <button type="submit" style={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <>
                <span style={styles.loadingSpinner}>🔄</span>
                保存中...
              </>
            ) : (
              '💾 保存更改'
            )}
          </button>
        </div>
      </form>
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
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  avatarIcon: {
    fontSize: '32px',
    marginBottom: '4px',
  },
  avatarText: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#374151',
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
    backgroundColor: '#e5e7eb',
  },
  uploadProgressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s ease',
  },
  changeAvatarBtn: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '32px',
    height: '32px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
    transition: 'background-color 0.2s',
  },
  removeAvatarBtn: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '24px',
    height: '24px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: '2px solid white',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
    transition: 'background-color 0.2s',
  },
  avatarHint: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#9ca3af',
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
  },
  textarea: {
    padding: '12px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  textareaCount: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'right',
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
};

export default UserProfileEditor;
