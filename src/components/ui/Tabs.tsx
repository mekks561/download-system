import React from 'react';
import { Tabs as ShadcnTabs, TabsList, TabsTrigger, TabsContent } from './shadcn/Tabs';

export interface TabItem {
  key: string;
  label: string;
  disabled?: boolean;
  content?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey?: string;
  onChange?: (key: string) => void;
  variant?: 'line' | 'card';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeKey: externalActiveKey,
  onChange,
  variant = 'line',
  className = '',
}) => {
  const variantClasses = {
    line: '',
    card: '',
  };

  const combinedClasses = [
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <ShadcnTabs defaultValue={tabs[0]?.key || ''} value={externalActiveKey} onValueChange={onChange} className={combinedClasses}>
      <TabsList className="mb-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} disabled={tab.disabled}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key}>
          {tab.content}
        </TabsContent>
      ))}
    </ShadcnTabs>
  );
};

export default Tabs;