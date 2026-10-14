import React, { useState, useEffect } from 'react';
import { Button, Tooltip, TooltipTrigger, TooltipContent } from './ui/shadcn';
import { PwaService } from '../services/PwaService';
import { useTranslation } from 'react-i18next';

const PwaInstallButton: React.FC = () => {
  const [showInstall, setShowInstall] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkInstallable = () => {
      // We can't directly check if it's installable, but we can check if it's already standalone
      if (!PwaService.isStandalone()) {
        // If not standalone, we listen for the event via PwaService
        // But the event might have already fired. 
        // In a real app, you'd use a more robust state management for this.
        const handlePrompt = () => setShowInstall(true);
        window.addEventListener('beforeinstallprompt', handlePrompt);
        return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
      }
    };

    void checkInstallable();
  }, []);

  const handleInstall = async () => {
    const success = await PwaService.installApp();
    if (success) {
      setShowInstall(false);
    }
  };

  if (!showInstall) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleInstall}
          className="text-pink-600 animate-bounce-slow"
        >
          <span className="text-lg">📲</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('pwa.install', 'Install App')}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default PwaInstallButton;
