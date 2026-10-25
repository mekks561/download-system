import React, { useCallback, useEffect, useState } from 'react';
import type { StorageListing } from '@dm/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from './ui/shadcn';
import { StorageService } from '../services/StorageService';

/**
 * 服务端目录浏览器（下载目录选择器）。
 *
 * 为什么不调系统目录框：浏览器既没有「选目录并拿到绝对路径」的能力，选到的也只会是
 * **客户端**的目录，而下载管理器需要的是**服务端**路径（文件最终落在 NAS 上）。
 * 因此这里列出服务端目录树让用户逐层点选；桌面端有 Electron 桥时仍优先用原生对话框
 * （见 Step3Config 的分支）。
 *
 * 交互：面包屑 + 列表点击进入 + 行内「选它」直接选中 + 手填路径跳转。
 * 可写性由服务端判定（`writable`），不可写时禁用确认并说明原因——不假装能写。
 */

export interface DirectoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 打开时定位到的目录（通常为当前已填值）；为空则落到下载根目录 */
  initialPath?: string;
  onSelect: (dir: string) => void;
}

/** 服务端路径分隔符：NAS/Linux 为 '/'，Windows 开发机为 '\' */
function separatorOf(path: string): string {
  return path.includes('\\') && !path.includes('/') ? '\\' : '/';
}

/** 路径末段名（用于面包屑首项；`/` 这类根路径原样返回） */
function baseName(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '');
  if (!trimmed) return path;
  const segs = trimmed.split(/[\\/]+/);
  return segs[segs.length - 1] || trimmed;
}

/**
 * 由「根目录 + 当前目录」推面包屑。
 *
 * 只按字面拼接而不用 dirname：后端保证当前目录一定在 root 之内，
 * 所以从 root 往下切分比逐级 dirname 更不容易在混合分隔符下出错。
 */
function buildCrumbs(root: string, current: string): { name: string; path: string }[] {
  const crumbs = [{ name: baseName(root), path: root }];
  if (current === root) return crumbs;

  const sep = separatorOf(current);
  const rel = current.slice(root.length).replace(/^[\\/]+/, '');
  let acc = root.replace(/[\\/]+$/, '');
  for (const seg of rel.split(/[\\/]+/).filter(Boolean)) {
    acc = `${acc}${sep}${seg}`;
    crumbs.push({ name: seg, path: acc });
  }
  return crumbs;
}

const DirectoryPickerModal: React.FC<DirectoryPickerModalProps> = ({
  open,
  onOpenChange,
  initialPath,
  onSelect,
}) => {
  const [listing, setListing] = useState<StorageListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manual, setManual] = useState('');

  const load = useCallback(
    async (target?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await StorageService.listDirectories(target);
        setListing(data);
        setManual(data.path);
        setNotice(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : '无法读取目录';
        // 定位失败（例如本地存的旧路径在新服务器上不存在）时退回根目录，
        // 让用户至少能从根开始点，而不是卡在一个死页面上
        if (target) {
          try {
            const root = await StorageService.listDirectories();
            setListing(root);
            setManual(root.path);
            setNotice(`无法定位到「${target}」，已回到下载根目录`);
            setError(message);
            return;
          } catch {
            // 连根目录都读不到：下面统一展示原始错误
          }
        }
        setListing(null);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 每次打开都重新定位：目录内容会变，且上次的选择可能与当前值不一致。
  // 提示语的清理交给 load 自己（成功即清空、定位失败则给出说明），这里不额外 setState
  useEffect(() => {
    if (!open) return;
    void load(initialPath?.trim() ? initialPath.trim() : undefined);
  }, [open, initialPath, load]);

  const crumbs = listing ? buildCrumbs(listing.root, listing.path) : [];
  const canPick = !!listing && listing.writable;

  const confirm = () => {
    if (!listing || !listing.writable) return;
    onSelect(listing.path);
    onOpenChange(false);
  };

  const pickRow = (dir: string) => {
    onSelect(dir);
    onOpenChange(false);
  };

  const handleNativePick = async () => {
    const dm = window.dm;
    if (dm) {
      const path = await dm.dialog.openDirectory();
      if (path) {
        onSelect(path);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-testid="dir-picker">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>选择下载目录</DialogTitle>
            {window.dm && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNativePick}
                className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
              >
                🖥️ 使用系统原生对话框
              </Button>
            )}
          </div>
          <DialogDescription>
            这里浏览的是<strong>服务器</strong>上的目录——下载的文件最终保存在这个位置。
            范围限制在服务端配置的下载根目录内。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 面包屑：根目录 → … → 当前目录 */}
          <div className="flex flex-wrap items-center gap-1 text-xs" data-testid="dir-picker-crumbs">
            {crumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <span className="text-gray-300">/</span>}
                <button
                  type="button"
                  className={
                    index === crumbs.length - 1
                      ? 'font-medium text-pink-600'
                      : 'text-gray-500 hover:text-pink-600 hover:underline'
                  }
                  onClick={() => void load(crumb.path)}
                  disabled={loading || index === crumbs.length - 1}
                  data-testid={`dir-picker-crumb-${index}`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* 当前路径 + 上一级 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => listing?.parent && void load(listing.parent)}
              disabled={loading || !listing?.parent}
              data-testid="dir-picker-up"
            >
              上一级
            </Button>
            <Input
              value={listing?.path ?? ''}
              readOnly
              aria-label="当前目录"
              data-testid="dir-picker-path"
            />
          </div>

          {/* 目录列表 */}
          <div
            className="h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white/60"
            data-testid="dir-picker-list"
          >
            {loading && <p className="p-4 text-sm text-gray-400">读取中…</p>}
            {!loading && !listing && (
              <p className="p-4 text-sm text-gray-400">没有可显示的目录</p>
            )}
            {!loading && listing && listing.directories.length === 0 && (
              <p className="p-4 text-sm text-gray-400" data-testid="dir-picker-empty">
                该目录下没有子目录，可直接选择当前目录
              </p>
            )}
            {!loading &&
              listing?.directories.map((dir) => (
                <div
                  key={dir.path}
                  className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-pink-50/60"
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-left text-sm text-gray-700"
                    onClick={() => void load(dir.path)}
                    title={`进入 ${dir.name}`}
                    data-testid={`dir-picker-entry-${dir.name}`}
                  >
                    📁 {dir.name}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-pink-600 hover:underline"
                    onClick={() => pickRow(dir.path)}
                    disabled={!listing.writable}
                    title={listing.writable ? '直接选择该子目录' : '当前目录不可写，无法选择子目录'}
                    data-testid={`dir-picker-pick-${dir.name}`}
                  >
                    选它
                  </button>
                </div>
              ))}
            {!loading && listing?.truncated && (
              <p className="p-3 text-xs text-amber-600">子目录过多，仅显示前 500 个。</p>
            )}
          </div>

          {/* 手填路径跳转：面包屑只能覆盖根目录之内，粘贴长路径更省事 */}
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="也可直接粘贴服务器上的绝对路径，回车跳转"
              aria-label="手动输入路径"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void load(manual.trim() || undefined);
                }
              }}
              data-testid="dir-picker-manual"
            />
            <Button
              variant="outline"
              onClick={() => void load(manual.trim() || undefined)}
              disabled={loading}
              data-testid="dir-picker-manual-go"
            >
              前往
            </Button>
          </div>

          {notice && (
            <Alert variant="warning" data-testid="dir-picker-notice">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}
          {error && (
            <p className="text-sm text-red-600" data-testid="dir-picker-error">
              {error}
            </p>
          )}
          {listing && !listing.writable && (
            <p className="text-sm text-amber-600" data-testid="dir-picker-readonly">
              该目录不可写，请换一个目录（服务端已确认没有写权限）。
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="dir-picker-cancel">
            取消
          </Button>
          <Button
            onClick={confirm}
            disabled={!canPick || loading}
            title={canPick ? undefined : '当前目录不可写，无法选择'}
            data-testid="dir-picker-confirm"
          >
            选择此目录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DirectoryPickerModal;
