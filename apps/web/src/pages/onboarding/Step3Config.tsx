import React, { useState } from 'react';
import { Button, Input, Label } from '../../components/ui/shadcn';
import DirectoryPickerModal from '../../components/DirectoryPickerModal';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getBridge, hasDesktopBridge } from '../../services/onboardingGate';

/**
 * Step 3：设置下载目录
 *
 * 两条选择路径，按运行形态自动分流：
 * - **桌面端**（Electron 桥存在）：走主进程 showOpenDialog（`window.onboarding.pickDirectory`），
 *   选的是本机目录，符合桌面版「下载到自己电脑」的预期。
 * - **Web 端**：浏览器既调不起系统目录框、也拿不到服务端路径，而下载最终落在服务器上，
 *   因此打开服务端目录浏览器（DirectoryPickerModal）逐层点选。
 *
 * spec §3.5 要求「目录无写权限 → 提示该目录不可写」。写权限判定在 Web 端由**服务端**
 * 完成（fs.access），桌面端由主进程完成——两端都不猜。
 */
const Step3Config: React.FC = () => {
  const config = useOnboardingStore((s) => s.config);
  const setConfigField = useOnboardingStore((s) => s.setConfigField);
  const persistConfig = useOnboardingStore((s) => s.persistConfig);
  const back = useOnboardingStore((s) => s.back);
  const error = useOnboardingStore((s) => s.error);
  const [picking, setPicking] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const desktop = hasDesktopBridge();

  const handlePick = async () => {
    const bridge = getBridge();
    if (typeof bridge?.pickDirectory !== 'function') {
      // 无桌面桥 → 服务端目录浏览器（Web 部署下唯一能真正选到目录的方式）
      setPickerOpen(true);
      return;
    }
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
            placeholder={desktop ? 'D:\\Downloads' : '点击「选择目录」浏览服务器目录，或手填绝对路径'}
            onChange={(e) => setConfigField('downloadDir', e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => void handlePick()}
            disabled={picking}
            data-testid="onboarding-pick-dir"
          >
            {picking ? '选择中…' : '选择目录'}
          </Button>
        </div>
        {desktop ? (
          <p className="text-xs text-gray-400" data-testid="onboarding-dir-hint">
            将打开系统目录选择框，选取本机目录。
          </p>
        ) : (
          <p className="text-xs text-gray-400" data-testid="onboarding-dir-hint">
            将打开<strong>服务器</strong>目录浏览器：下载文件最终保存在服务器上，所以这里选的是服务端目录
            （范围限于服务端配置的下载根目录）。也可以直接手填绝对路径。
          </p>
        )}
      </div>

      <DirectoryPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialPath={config.downloadDir}
        onSelect={(dir) => setConfigField('downloadDir', dir)}
      />

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
