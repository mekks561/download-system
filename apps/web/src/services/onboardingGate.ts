import { OnboardingApiService } from './OnboardingApiService';
import { SettingsService } from './SettingsService';
import { isApiError } from './api';

/**
 * 首次运行判定与本地状态（哨兵文件的 Web 等价物）
 *
 * 设计对齐 spec §3.1「哨兵文件 + users 表为空双重判定」：
 * - 桌面端（Electron）：由主进程维护 `%APPDATA%/download-manager/.onboarded` 哨兵文件，
 *   通过 `window.onboarding` 桥暴露 isFirstRun / markOnboarded；本模块只做能力检测后调用，
 *   桌面外壳未落地时自动退回 Web 判定，无需改动本文件。
 * - Web 端：哨兵以 localStorage 代替（同一份判定语义），后端 `setup-status` 提供
 *   「users 表是否为空」这另一半信号。
 *
 * 注意：哨兵在这里只是「用户已走过/跳过了向导」的本地记忆，不参与鉴权；
 * 真正的门禁在后端 —— `POST /auth/setup` 只允许 users 表为空时调用。
 */

const SENTINEL_KEY = 'dm_onboarded';
const MUST_CHANGE_KEY = 'dm_must_change_password';
const CONFIG_KEY = 'dm_download_config';

export interface DownloadConfig {
  downloadDir: string;
  maxConcurrent: number;
  speedLimitKBps: number;
}

/** 桌面端桥的约定接口（Electron 侧实现它即可，前端无需再改） */
export interface OnboardingBridge {
  isFirstRun?(): Promise<boolean>;
  markOnboarded?(): Promise<void>;
  pickDirectory?(): Promise<string | null>;
  saveSettings?(config: DownloadConfig): Promise<void>;
}

export function getBridge(): OnboardingBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { onboarding?: OnboardingBridge }).onboarding;
}

/** 桌面端是否接上了（决定「选择目录」按钮与设置持久化的方式） */
export function hasDesktopBridge(): boolean {
  return typeof getBridge()?.pickDirectory === 'function';
}

function readSentinel(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(SENTINEL_KEY) === '1';
}

function writeSentinel(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SENTINEL_KEY, '1');
}

/**
 * 是否应当进入向导。
 *
 * 双重判定：本地哨兵存在 → 不再引导；否则问后端「users 表是否为空」，
 * 为空才引导。若后端已初始化（例如换了数据库但本地哨兵丢了），
 * 顺手补写哨兵，避免每次启动都多问一次后端。
 */
export async function shouldOnboard(): Promise<boolean> {
  const bridge = getBridge();
  if (typeof bridge?.isFirstRun === 'function') {
    try {
      return await bridge.isFirstRun();
    } catch {
      // 桌面桥异常时退回 Web 判定，不让引导流程整体挂掉
    }
  }

  if (readSentinel()) return false;

  const { needsSetup } = await OnboardingApiService.getStatus();
  if (!needsSetup) {
    writeSentinel();
    return false;
  }
  return true;
}

/** 写哨兵：桌面端写文件，Web 端写 localStorage（两边都写，保证切换形态后判定一致） */
export async function markOnboarded(): Promise<void> {
  const bridge = getBridge();
  if (typeof bridge?.markOnboarded === 'function') {
    try {
      await bridge.markOnboarded();
    } catch {
      // 桌面端写文件失败不阻塞流程，本地哨兵仍会写入
    }
  }
  writeSentinel();
}

export function hasOnboarded(): boolean {
  return readSentinel();
}

/** 标记「当前账号使用自动生成的口令，需尽快修改」 */
export function setMustChangePassword(required: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (required) localStorage.setItem(MUST_CHANGE_KEY, '1');
  else localStorage.removeItem(MUST_CHANGE_KEY);
}

export function isMustChangePassword(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(MUST_CHANGE_KEY) === '1';
}

function writeLocalConfig(config: DownloadConfig): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * 保存下载配置，返回**实际持久化的值**（服务端可能把路径归一化，调用方应以返回值为准）。
 *
 * 持久化分层（下载目录是服务端属性，权威副本在后端）：
 * 1. 桌面端有主进程桥 → 交给主进程（本机目录，符合桌面版语义）；
 * 2. 否则写服务端 `app_settings` 表（权威），成功后再镜像一份到 localStorage 供离线读取；
 * 3. 失败分流：后端**明确拒绝**（目录不可写/越界等，带 error.code）→ 原样抛出，
 *    让用户在向导里看到中文原因；纯网络故障 → 回落 localStorage，不阻塞向导。
 */
export async function saveDownloadConfig(config: DownloadConfig): Promise<DownloadConfig> {
  const bridge = getBridge();
  if (typeof bridge?.saveSettings === 'function') {
    try {
      await bridge.saveSettings(config);
      return config;
    } catch {
      // 主进程持久化失败时继续走下面的服务端/localStorage，至少不让用户白填一遍
    }
  }

  try {
    const saved = await SettingsService.saveDownload(config);
    // 服务端返回的是归一化后的权威值（例如相对路径 → 绝对路径），以它为准
    const persisted: DownloadConfig = {
      downloadDir: saved.downloadDir,
      maxConcurrent: saved.maxConcurrent,
      speedLimitKBps: saved.speedLimitKBps,
    };
    writeLocalConfig(persisted);
    return persisted;
  } catch (err) {
    if (isApiError(err)) throw err;
    writeLocalConfig(config);
    return config;
  }
}

export function loadDownloadConfig(): DownloadConfig | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DownloadConfig;
  } catch {
    return null;
  }
}

/** 测试用：清空本地引导状态 */
export function resetOnboardingLocalState(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(SENTINEL_KEY);
  localStorage.removeItem(MUST_CHANGE_KEY);
  localStorage.removeItem(CONFIG_KEY);
}
