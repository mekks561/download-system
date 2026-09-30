import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasOnboarded,
  isMustChangePassword,
  loadDownloadConfig,
  markOnboarded,
  resetOnboardingLocalState,
  saveDownloadConfig,
  setMustChangePassword,
  shouldOnboard,
  type OnboardingBridge,
} from '../onboardingGate';

vi.mock('../OnboardingApiService', () => ({
  OnboardingApiService: { getStatus: vi.fn() },
}));

import { OnboardingApiService } from '../OnboardingApiService';

const mocked = OnboardingApiService as unknown as { getStatus: ReturnType<typeof vi.fn> };

function installBridge(bridge: OnboardingBridge | undefined) {
  (window as unknown as { onboarding?: OnboardingBridge }).onboarding = bridge;
}

describe('onboardingGate · 首次运行判定', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetOnboardingLocalState();
    installBridge(undefined);
  });

  afterEach(() => {
    installBridge(undefined);
  });

  it('无哨兵且后端 users 表为空 → 需要引导', async () => {
    mocked.getStatus.mockResolvedValue({ needsSetup: true });
    await expect(shouldOnboard()).resolves.toBe(true);
    expect(mocked.getStatus).toHaveBeenCalledTimes(1);
  });

  it('已有哨兵 → 直接不引导，且不打扰后端', async () => {
    localStorage.setItem('dm_onboarded', '1');
    await expect(shouldOnboard()).resolves.toBe(false);
    expect(mocked.getStatus).not.toHaveBeenCalled();
  });

  it('后端已初始化但本地哨兵丢失 → 不引导，并补写哨兵', async () => {
    mocked.getStatus.mockResolvedValue({ needsSetup: false });

    await expect(shouldOnboard()).resolves.toBe(false);
    expect(hasOnboarded()).toBe(true);
  });

  it('桌面端桥存在时以主进程的哨兵文件为准', async () => {
    const isFirstRun = vi.fn().mockResolvedValue(false);
    installBridge({ isFirstRun });

    await expect(shouldOnboard()).resolves.toBe(false);
    expect(isFirstRun).toHaveBeenCalledTimes(1);
    // 桥给了结论就不该再去问后端
    expect(mocked.getStatus).not.toHaveBeenCalled();
  });

  it('桌面端桥抛错时退回 Web 判定，不整体失败', async () => {
    installBridge({ isFirstRun: vi.fn().mockRejectedValue(new Error('IPC 挂了')) });
    mocked.getStatus.mockResolvedValue({ needsSetup: true });

    await expect(shouldOnboard()).resolves.toBe(true);
  });

  it('markOnboarded 同时通知桌面桥并写本地哨兵', async () => {
    const mark = vi.fn().mockResolvedValue(undefined);
    installBridge({ markOnboarded: mark });

    await markOnboarded();

    expect(mark).toHaveBeenCalledTimes(1);
    expect(hasOnboarded()).toBe(true);
  });

  it('桌面桥写文件失败时本地哨兵仍然写入', async () => {
    installBridge({ markOnboarded: vi.fn().mockRejectedValue(new Error('磁盘只读')) });

    await markOnboarded();

    expect(hasOnboarded()).toBe(true);
  });
});

describe('onboardingGate · 强制改密标记与配置', () => {
  beforeEach(() => {
    localStorage.clear();
    resetOnboardingLocalState();
    installBridge(undefined);
  });

  it('改密标记可设可清', () => {
    expect(isMustChangePassword()).toBe(false);
    setMustChangePassword(true);
    expect(isMustChangePassword()).toBe(true);
    setMustChangePassword(false);
    expect(isMustChangePassword()).toBe(false);
  });

  it('Web 端配置落 localStorage', async () => {
    await saveDownloadConfig({ downloadDir: '/data/dl', maxConcurrent: 4, speedLimitKBps: 100 });

    expect(loadDownloadConfig()).toEqual({ downloadDir: '/data/dl', maxConcurrent: 4, speedLimitKBps: 100 });
  });

  it('桌面端配置交给主进程持久化', async () => {
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    installBridge({ saveSettings });

    await saveDownloadConfig({ downloadDir: 'D:\\dl', maxConcurrent: 5, speedLimitKBps: 0 });

    expect(saveSettings).toHaveBeenCalledWith({ downloadDir: 'D:\\dl', maxConcurrent: 5, speedLimitKBps: 0 });
  });

  it('桌面端持久化失败时退回本地存储', async () => {
    installBridge({ saveSettings: vi.fn().mockRejectedValue(new Error('IPC 挂了')) });

    await saveDownloadConfig({ downloadDir: 'D:\\dl', maxConcurrent: 5, speedLimitKBps: 0 });

    expect(loadDownloadConfig()?.downloadDir).toBe('D:\\dl');
  });

  it('localStorage 中的配置损坏时返回 null 而非抛错', () => {
    localStorage.setItem('dm_download_config', '{不是合法 JSON');
    expect(loadDownloadConfig()).toBeNull();
  });
});
