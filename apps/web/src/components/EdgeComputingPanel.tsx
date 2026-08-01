import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Label,
  Badge,
  Progress,
  Separator,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './ui/shadcn';
import { useEdgeComputingStore } from '../store/useEdgeComputingStore';
import { EdgeComputingMode, NetworkProfile } from '../services/EdgeComputingService';

const EdgeComputingPanel: React.FC = () => {
  const {
    stats,
    networkProfiles,
    isLoading,
    setMode,
    addNetworkProfile,
    updateNetworkProfile,
    deleteNetworkProfile,
    loadLocalModel,
  } = useEdgeComputingStore();

  useEffect(() => {
    if (!stats.isLowPowerMode && stats.batteryLevel > 0.3) {
      const classificationModel = {
        id: 'model_classification',
        name: '文件分类模型',
        version: '1.0.0',
        size: 5 * 1024 * 1024,
        type: 'classification' as const,
      };
      loadLocalModel(classificationModel);
    }
  }, [stats.isLowPowerMode, stats.batteryLevel, loadLocalModel]);

  const modeOptions: { value: EdgeComputingMode; label: string; description: string }[] = [
    { value: 'auto', label: '自动模式', description: '根据网络和电池状态自动调整' },
    { value: 'performance', label: '性能模式', description: '最大化下载速度和并发数' },
    { value: 'battery_saver', label: '省电模式', description: '限制下载以节省电量' },
    { value: 'offline_first', label: '离线优先', description: '优先处理离线队列任务' },
  ];

  const qualityLabels: Record<string, { label: string; color: string }> = {
    excellent: { label: '优秀', color: 'bg-emerald-100 text-emerald-800' },
    good: { label: '良好', color: 'bg-green-100 text-green-800' },
    fair: { label: '一般', color: 'bg-amber-100 text-amber-800' },
    poor: { label: '较差', color: 'bg-red-100 text-red-800' },
    offline: { label: '离线', color: 'bg-gray-100 text-gray-800' },
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddProfile = () => {
    const newProfile: Omit<NetworkProfile, 'id' | 'createdAt'> = {
      name: '新建网络配置',
      type: 'unknown',
      quality: 'good',
      maxConcurrentDownloads: 3,
      speedLimit: 0,
      autoResume: true,
    };
    addNetworkProfile(newProfile);
  };

  const handleUpdateProfile = (id: string, key: keyof NetworkProfile, value: unknown) => {
    updateNetworkProfile(id, { [key]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            边缘计算模式
          </CardTitle>
          <CardDescription>管理下载管理器的边缘计算配置和自适应策略</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  运行模式
                </Label>
                <p className="text-sm text-gray-500">
                  {modeOptions.find((m) => m.value === stats.mode)?.description}
                </p>
              </div>
              <Select value={stats.mode} onValueChange={(value) => setMode(value as EdgeComputingMode)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">网络质量</div>
                <Badge className={qualityLabels[stats.networkQuality]?.color || 'bg-gray-100 text-gray-800'}>
                  {qualityLabels[stats.networkQuality]?.label}
                </Badge>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">电池电量</div>
                <div className="flex items-center gap-2">
                  <Progress value={stats.batteryLevel * 100} className="w-20 h-2" />
                  <span className="text-sm font-medium">{Math.round(stats.batteryLevel * 100)}%</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">推荐并发数</div>
                <span className="text-xl font-bold text-primary-500">
                  {stats.concurrentDownloads}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">自适应速度限制</div>
                <span className="text-lg font-semibold">
                  {stats.adaptiveSpeedLimit > 0 ? formatBytes(stats.adaptiveSpeedLimit) + '/s' : '无限制'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">WebAssembly支持</div>
                <Badge className={stats.isWasmSupported ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                  {stats.isWasmSupported ? '已支持' : '不支持'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-700">低电量模式</Label>
                <p className="text-xs text-gray-500">
                  当电量低于20%时自动启用省电模式
                </p>
              </div>
              <Switch checked={stats.isLowPowerMode} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              系统资源
            </CardTitle>
            <CardDescription>监控当前系统资源使用情况</CardDescription>
          </div>
          <Badge variant="outline">实时更新</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">内存使用</Label>
                <span className="text-sm text-gray-500">
                  {formatBytes(stats.usedMemory)} / {formatBytes(stats.availableMemory + stats.usedMemory)}
                </span>
              </div>
              <Progress value={stats.availableMemory > 0 ? (stats.usedMemory / (stats.availableMemory + stats.usedMemory)) * 100 : 0} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">CPU使用</Label>
                <span className="text-sm text-gray-500">{stats.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={stats.cpuUsage} />
            </div>

            {stats.wasmModulesLoaded.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  已加载的WASM模块
                </Label>
                <div className="flex flex-wrap gap-2">
                  {stats.wasmModulesLoaded.map((module) => (
                    <Badge key={module} variant="secondary">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              网络配置文件
            </CardTitle>
            <CardDescription>为不同网络类型配置下载策略</CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={handleAddProfile} disabled={isLoading}>
            + 添加配置
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {networkProfiles.map((profile) => (
              <AccordionItem key={profile.id} value={profile.id} className="bg-gray-50 rounded-lg">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {profile.type === 'wifi' ? '📶' : profile.type === 'cellular' ? '📱' : '🔌'}
                      </span>
                      <div>
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-sm text-gray-500">
                          {profile.type === 'wifi' ? 'WiFi' : profile.type === 'cellular' ? '移动网络' : profile.type === 'ethernet' ? '以太网' : '未知'}
                          {' · '}
                          {qualityLabels[profile.quality]?.label}
                        </div>
                      </div>
                    </div>
                    <Badge className={profile.autoResume ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'}>
                      {profile.autoResume ? '自动恢复' : '手动恢复'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">
                          最大并发下载数
                        </Label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={profile.maxConcurrentDownloads}
                          onChange={(e) => handleUpdateProfile(profile.id, 'maxConcurrentDownloads', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-1 block">
                          速度限制 (KB/s)
                        </Label>
                        <input
                          type="number"
                          min="0"
                          value={profile.speedLimit > 0 ? profile.speedLimit / 1024 : 0}
                          onChange={(e) => handleUpdateProfile(profile.id, 'speedLimit', (parseInt(e.target.value) || 0) * 1024)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">自动恢复下载</Label>
                        <p className="text-xs text-gray-500">网络恢复时自动继续下载</p>
                      </div>
                      <Switch
                        checked={profile.autoResume}
                        onCheckedChange={(checked) => handleUpdateProfile(profile.id, 'autoResume', checked)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteNetworkProfile(profile.id)}
                      >
                        删除配置
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default EdgeComputingPanel;