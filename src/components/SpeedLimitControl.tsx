import React, { useState } from 'react';
import { Button } from './ui/shadcn/Button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@radix-ui/react-dialog';
import { Switch } from './ui/shadcn/Switch';
import { Slider } from './ui/shadcn/Slider';
import { useSpeedLimit, PRESET_LIMITS, SpeedLimitUnit } from '../services/speedLimitService';

export const SpeedLimitControl: React.FC = () => {
  const { config, setConfig, getBytesPerSecond } = useSpeedLimit();
  const [localLimit, setLocalLimit] = useState(config.limit);
  const [localUnit, setLocalUnit] = useState<SpeedLimitUnit>(config.unit);

  const handleSave = () => {
    setConfig({
      enabled: config.enabled,
      limit: localLimit,
      unit: localUnit,
    });
  };

  const handleToggle = () => {
    setConfig({
      enabled: !config.enabled,
      limit: localLimit,
      unit: localUnit,
    });
  };

  const handlePresetSelect = (limit: number, unit: SpeedLimitUnit) => {
    if (limit === 0) {
      setConfig({ enabled: false, limit: 100, unit: 'KB/s' });
      setLocalLimit(100);
      setLocalUnit('KB/s');
    } else {
      setLocalLimit(limit);
      setLocalUnit(unit);
    }
  };

  const currentLimitBytes = getBytesPerSecond();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {config.enabled ? (
            <>⚡ {localLimit} {localUnit}</>
          ) : (
            <>⚡ 速度限制</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="flex items-center gap-2">
          ⚡ 下载速度限制
        </DialogTitle>

        <div className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">启用速度限制</span>
            <Switch checked={config.enabled} onCheckedChange={handleToggle} />
          </div>

          {config.enabled && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  预设速度
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_LIMITS.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetSelect(preset.limit, preset.unit)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        localLimit === preset.limit && localUnit === preset.unit
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">自定义速度</label>
                  <span className="text-sm text-primary-600 font-medium">
                    {localLimit} {localUnit}
                  </span>
                </div>
                <Slider
                  value={[localLimit]}
                  onValueChange={([value]) => setLocalLimit(value)}
                  min={1}
                  max={localUnit === 'KB/s' ? 1024 : 50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{localUnit === 'KB/s' ? '1 KB/s' : '1 MB/s'}</span>
                  <span>{localUnit === 'KB/s' ? '1024 KB/s' : '50 MB/s'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">单位</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocalUnit('KB/s')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                      localUnit === 'KB/s'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    KB/s
                  </button>
                  <button
                    onClick={() => setLocalUnit('MB/s')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                      localUnit === 'MB/s'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    MB/s
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave}>保存设置</Button>
              </div>
            </>
          )}

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            {currentLimitBytes > 0 ? (
              <p>当前限制: {currentLimitBytes.toLocaleString()} 字节/秒</p>
            ) : (
              <p>当前未启用速度限制</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
