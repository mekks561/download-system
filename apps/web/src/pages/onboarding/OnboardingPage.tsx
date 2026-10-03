import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
} from '../../components/ui/shadcn';
import { useOnboardingStore, type OnboardingStep } from '../../store/useOnboardingStore';
import Step1Welcome from './Step1Welcome';
import Step2Admin from './Step2Admin';
import Step3Config from './Step3Config';
import Step4Done from './Step4Done';

const STEP_TITLES = ['欢迎', '创建管理员', '下载目录', '完成'];

/**
 * S1 向导容器：4 步状态机 + 进度指示 + 一次性口令展示
 *
 * - 未完成后关闭页面：本组件不写哨兵、也不落任何持久化，下次进入仍从 Step 1 开始（spec §3.5）
 * - 跳过向导：后端返回随机口令，必须先让用户看到并确认，再跳转主界面
 */
const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const step = useOnboardingStore((s) => s.step);
  const finished = useOnboardingStore((s) => s.finished);
  const generatedPassword = useOnboardingStore((s) => s.generatedPassword);
  const reset = useOnboardingStore((s) => s.reset);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  // 每次进入向导都从干净状态开始（store 不持久化，但同一次会话内可能残留）
  useEffect(() => {
    reset();
  }, [reset]);

  // 完成且没有待确认的一次性口令时，跳转主界面
  useEffect(() => {
    if (finished && !generatedPassword) {
      void navigate('/downloads', { replace: true });
    }
  }, [finished, generatedPassword, navigate]);

  const handleCopy = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard?.writeText(generatedPassword);
      setCopied(true);
    } catch {
      // 剪贴板不可用（非安全上下文/无权限）时用户仍可手动抄写
      setCopied(false);
    }
  };

  const steps: Record<OnboardingStep, React.ReactNode> = {
    1: <Step1Welcome />,
    2: <Step2Admin />,
    3: <Step3Config />,
    4: <Step4Done />,
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <Card className="w-full max-w-lg relative z-10 bg-white/80 backdrop-blur-md border-pink-100">
        <CardContent className="pt-6 space-y-6">
          {/* 进度：4 步指示 */}
          <div className="flex items-center justify-between" data-testid="onboarding-progress">
            {STEP_TITLES.map((title, index) => {
              const no = (index + 1) as OnboardingStep;
              const active = no === step;
              const done = no < step || finished;
              return (
                <React.Fragment key={title}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        done
                          ? 'bg-green-500 text-white'
                          : active
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {done ? '✓' : no}
                    </div>
                    <span className={`text-xs ${active ? 'text-pink-600' : 'text-gray-400'}`}>{title}</span>
                  </div>
                  {index < STEP_TITLES.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {generatedPassword ? (
            <div className="space-y-4" data-testid="onboarding-generated-password">
              <Alert variant="warning">
                <AlertTitle>请立即保存这个初始密码</AlertTitle>
                <AlertDescription>
                  系统为你生成了随机初始密码。出于安全考虑，它<strong>只会显示这一次</strong>
                  ，关闭后无法再次查看，请先复制保存。
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <code
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-gray-50 font-mono text-sm break-all"
                  data-testid="onboarding-password-value"
                >
                  {generatedPassword}
                </code>
                <Button variant="outline" onClick={() => void handleCopy()} data-testid="onboarding-copy-password">
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                账号：<span className="font-medium">admin@dm.local</span>
                （用户名 admin）。登录后请尽快在「个人中心」修改密码。
              </p>

              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  data-testid="onboarding-ack-password"
                  className="mt-0.5"
                />
                我已保存好这个密码
              </label>

              <Button
                className="w-full"
                disabled={!acknowledged}
                onClick={() => void navigate('/downloads', { replace: true })}
                data-testid="onboarding-enter-app"
              >
                进入主界面
              </Button>
            </div>
          ) : (
            steps[step]
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPage;
