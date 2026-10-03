import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/shadcn';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { OnboardingApiService } from '../../services/OnboardingApiService';
import { loadDownloadConfig } from '../../services/onboardingGate';

/**
 * Step 4：完成
 *
 * 三项检查：管理员账号 / 下载目录 / 后端与数据库连通性。
 * spec §3.5：数据库检查失败只提示、不阻塞向导。
 */
const Step4Done: React.FC = () => {
  const adminCreated = useOnboardingStore((s) => s.adminCreated);
  const config = useOnboardingStore((s) => s.config);
  const complete = useOnboardingStore((s) => s.complete);
  const back = useOnboardingStore((s) => s.back);

  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await OnboardingApiService.isBackendHealthy();
      if (!cancelled) {
        setDbOk(ok);
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savedDir = config.downloadDir || loadDownloadConfig()?.downloadDir || '';

  const items: { label: string; ok: boolean | null; detail: string }[] = [
    { label: '管理员账号', ok: adminCreated, detail: adminCreated ? '已创建并登录' : '未创建' },
    { label: '下载目录', ok: Boolean(savedDir), detail: savedDir || '未设置' },
    {
      label: '后端服务与数据库',
      ok: checking ? null : dbOk,
      detail: checking ? '检测中…' : dbOk ? '连接正常' : '无法连接，可进入系统后重试',
    },
  ];

  return (
    <div className="space-y-6" data-testid="onboarding-step-4">
      <div className="text-center space-y-2">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-gray-800">初始化完成</h2>
        <p className="text-sm text-gray-500">一切就绪，开始使用吧。</p>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-sm" data-testid={`check-${item.label}`}>
            <span className="text-lg">{item.ok === null ? '⏳' : item.ok ? '✅' : '⚠️'}</span>
            <span className="font-medium text-gray-700 w-32">{item.label}</span>
            <span className="text-gray-500 truncate">{item.detail}</span>
          </li>
        ))}
      </ul>

      {dbOk === false && (
        <p className="text-xs text-amber-600" data-testid="onboarding-db-warning">
          后端暂时不可用也不影响完成初始化，进入系统后可随时重试。
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={back}>
          返回
        </Button>
        <Button className="flex-1" onClick={() => void complete()} data-testid="onboarding-finish">
          进入主界面
        </Button>
      </div>
    </div>
  );
};

export default Step4Done;
