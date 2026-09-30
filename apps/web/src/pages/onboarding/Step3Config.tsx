import React, { useState } from 'react';
import { Button, Input, Label } from '../../components/ui/shadcn';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getBridge, hasDesktopBridge } from '../../services/onboardingGate';

/**
 * Step 3：设置下载目录
 *
 * 目录选择在桌面端由 Electron 主进程的 showOpenDialog 提供（`window.onboarding.pickDirectory`）；
 * 桌面外壳未落地时退化为手填路径，并明确告知用户差异——不假装有原生能力。
 *
 * spec §3.5 要求「目录无写权限 → 提示该目录不可写」。Web 端浏览器无法探测本地目录写权限，
 * 因此该项校验在有桌面桥时由主进程完成；无桥时只做非空与路径形式校验。
 */
const Step3Config: React.FC = () => {
  const config = useOnboardingStore((s) => s.config);
  const setConfigField = useOnboardingStore((s) => s.setConfigField);
  const persistConfig = useOnboardingStore((s) => s.persistConfig);
  const back = useOnboardingStore((s) => s.back);
  const error = useOnboardingStore((s) => s.error);
  const [picking, setPicking] = useState(false);

  const desktop = hasDesktopBridge();

  const handlePick = async () => {
    const bridge = getBridge();
    if (typeof bridge?.pickDirectory !== 'function') return;
    setPicking(true);
    try {
      // 保留接收者调用，避免把方法摘出来后 this 丢失
      const dir = await bridge.pickDirectory();
      if (dir) setConfigField('downloadDir', dir);
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="onboarding-step-3">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-gray-800">设置下载目录</h2>
        <p className="text-sm text-gray-500">下载与上传的文件默认保存在这里。</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="onboarding-downloadDir">下载目录</Label>
        <div className="flex gap-2">
          <Input
            id="onboarding-downloadDir"
            data-testid="onboarding-downloadDir"
            value={config.downloadDir}
            placeholder={desktop ? '点击右侧按钮选择目录' : '例如 D:\\Downloads'}
            onChange={(e) => setConfigField('downloadDir', e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => void handlePick()}
            disabled={!desktop || picking}
            title={desktop ? undefined : '浏览器中无法调用系统目录选择框，请手动填写路径'}
            data-testid="onboarding-pick-dir"
          >
            {picking ? '选择中…' : '选择目录'}
          </Button>
        </div>
        {!desktop && (
          <p className="text-xs text-gray-400" data-testid="onboarding-dir-hint">
            当前在浏览器中运行，无法调起系统目录选择框，请手动填写绝对路径（桌面版可直接选取）。
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="onboarding-maxConcurrent">最大并发下载数</Label>
          <Input
            id="onboarding-maxConcurrent"
            data-testid="onboarding-maxConcurrent"
            type="number"
            min={1}
            max={10}
            value={config.maxConcurrent}
            onChange={(e) => setConfigField('maxConcurrent', Number(e.target.value))}
          />
          <p className="text-xs text-gray-400">1-10，默认 5</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="onboarding-speedLimit">限速（KB/s）</Label>
          <Input
            id="onboarding-speedLimit"
            data-testid="onboarding-speedLimit"
            type="number"
            min={0}
            value={config.speedLimitKBps}
            onChange={(e) => setConfigField('speedLimitKBps', Number(e.target.value))}
          />
          <p className="text-xs text-gray-400">0 表示不限速</p>
        </div>
      </div>

      {error && (
        <div className="auth-error" data-testid="onboarding-error">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={back}>
          返回
        </Button>
        <Button className="flex-1" onClick={() => void persistConfig()} data-testid="onboarding-save-config">
          保存并继续
        </Button>
      </div>
    </div>
  );
};

export default Step3Config;
