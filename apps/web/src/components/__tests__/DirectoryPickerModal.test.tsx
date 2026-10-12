import type { Mock } from 'vitest';
/// <reference types="vitest/globals" />
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { StorageListing } from '@dm/shared';
import DirectoryPickerModal from '../DirectoryPickerModal';

vi.mock('../../services/StorageService', () => ({
  StorageService: { listDirectories: vi.fn() },
}));

import { StorageService } from '../../services/StorageService';

const mocked = StorageService as unknown as { listDirectories: Mock };

const ROOT = '/data/downloads';

function listing(over: Partial<StorageListing> = {}): StorageListing {
  return {
    root: ROOT,
    path: ROOT,
    parent: null,
    writable: true,
    directories: [
      { name: 'movies', path: `${ROOT}/movies` },
      { name: 'music', path: `${ROOT}/music` },
    ],
    truncated: false,
    ...over,
  };
}

function renderModal(over: Partial<React.ComponentProps<typeof DirectoryPickerModal>> = {}) {
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <DirectoryPickerModal
      open
      onOpenChange={onOpenChange}
      onSelect={onSelect}
      {...over}
    />,
  );
  return { onSelect, onOpenChange };
}

describe('DirectoryPickerModal · 服务端目录浏览', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.listDirectories.mockResolvedValue(listing());
  });

  it('列出服务端目录：显示根面包屑与子目录', async () => {
    renderModal();

    await waitFor(() => expect(screen.getByTestId('dir-picker-path')).toHaveValue(ROOT));
    expect(screen.getByTestId('dir-picker-crumb-0')).toHaveTextContent('downloads');
    expect(screen.getByTestId('dir-picker-entry-movies')).toBeInTheDocument();
    expect(screen.getByTestId('dir-picker-entry-music')).toBeInTheDocument();
    // 已在根目录：上一级不可用
    expect(screen.getByTestId('dir-picker-up')).toBeDisabled();
  });

  it('点击目录进入下一层，并更新面包屑', async () => {
    mocked.listDirectories.mockImplementation((path?: string) =>
      Promise.resolve(
        path === `${ROOT}/movies`
          ? listing({
              path: `${ROOT}/movies`,
              parent: ROOT,
              directories: [{ name: '2026', path: `${ROOT}/movies/2026` }],
            })
          : listing(),
      ),
    );

    renderModal();
    await waitFor(() => expect(screen.getByTestId('dir-picker-entry-movies')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('dir-picker-entry-movies'));

    await waitFor(() =>
      expect(screen.getByTestId('dir-picker-path')).toHaveValue(`${ROOT}/movies`),
    );
    expect(mocked.listDirectories).toHaveBeenLastCalledWith(`${ROOT}/movies`);
    expect(screen.getByTestId('dir-picker-entry-2026')).toBeInTheDocument();
    expect(screen.getByTestId('dir-picker-crumb-1')).toHaveTextContent('movies');
    // 进入子目录后「上一级」可用
    expect(screen.getByTestId('dir-picker-up')).not.toBeDisabled();
  });

  it('「选择此目录」把当前路径回传并关闭', async () => {
    const { onSelect, onOpenChange } = renderModal();
    await waitFor(() => expect(screen.getByTestId('dir-picker-path')).toHaveValue(ROOT));

    fireEvent.click(screen.getByTestId('dir-picker-confirm'));

    expect(onSelect).toHaveBeenCalledWith(ROOT);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('行内「选它」可直接选中该子目录', async () => {
    const { onSelect, onOpenChange } = renderModal();
    await waitFor(() => expect(screen.getByTestId('dir-picker-pick-music')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('dir-picker-pick-music'));

    expect(onSelect).toHaveBeenCalledWith(`${ROOT}/music`);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('目录不可写：禁用确认与「选它」，并说明原因（不假装能写）', async () => {
    mocked.listDirectories.mockResolvedValue(listing({ writable: false }));

    renderModal();
    await waitFor(() => expect(screen.getByTestId('dir-picker-readonly')).toBeInTheDocument());

    expect(screen.getByTestId('dir-picker-confirm')).toBeDisabled();
    expect(screen.getByTestId('dir-picker-pick-movies')).toBeDisabled();
  });

  it('手填路径回车跳转；定位失败时退回根目录并提示', async () => {
    mocked.listDirectories.mockImplementation((path?: string) =>
      path === '/nowhere'
        ? Promise.reject(Object.assign(new Error('目录不存在'), { code: 'NOT_FOUND' }))
        : Promise.resolve(listing()),
    );

    renderModal();
    await waitFor(() => expect(screen.getByTestId('dir-picker-manual')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('dir-picker-manual'), { target: { value: '/nowhere' } });
    fireEvent.keyDown(screen.getByTestId('dir-picker-manual'), { key: 'Enter' });

    await waitFor(() => expect(screen.getByTestId('dir-picker-notice')).toBeInTheDocument());
    // 退回根目录：用户仍能从这里继续点，而不是面对空白弹窗
    expect(screen.getByTestId('dir-picker-path')).toHaveValue(ROOT);
    expect(screen.getByTestId('dir-picker-error')).toHaveTextContent('目录不存在');
  });
});
