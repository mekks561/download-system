import React from 'react';
import { Button } from '../../components/ui/shadcn';
import { useOnboardingStore } from '../../store/useOnboardingStore';

/**
 * Step 1：欢迎
 *
 * 两条出口：继续走 3 步向导，或跳过（跳过由后端创建默认管理员并回传一次性随机口令）。
 */
const Step1Welcome: React.FC = () => {
  const next = useOnboardingStore((s) => s.next);
  const submitSkip = useOnboardingStore((s) => s.submitSkip);
  const submitting = useOnboardingStore((s) => s.submitting);
  const error = useOnboardingStore((s) => s.error);

  return (
    <div className="space-y-6" data-testid="onboarding-step-1">
      <div className="text-center space-y-3">
        <div className="text-5xl bounce-soft">👋</div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
          欢迎使用下载管理器
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          接下来 3 步完成初始化：创建管理员账号 → 设置下载目录 → 完成。
          <br />
          整个过程不影响已有文件，随时可以跳过。
        </p>
      </div>

      <ul className="space-y-2 text-sm text-gray-600 bg-white/60 rounded-xl p-4 border border-pink-100">
        <li>📥 批量下载与断点续传、优先级管理</li>
        <li>📁 文件管理、上传与分享链接</li>
        <li>📊 下载统计与执行历史</li>
      </ul>

      {error && (
        <div className="auth-error" data-testid="onboarding-error">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={next} disabled={submitting} data-testid="onboarding-start">
          继续 →
        </Button>
        <Button
          variant="ghost"
          onClick={() => void submitSkip()}
          disabled={submitting}
          data-testid="onboarding-skip"
        >
          {submitting ? '处理中…' : '跳过向导'}
        </Button>
      </div>
    </div>
  );
};

export default Step1Welcome;
