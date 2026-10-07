import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

const Tabs = TabsPrimitive.Root;

export interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.List>>;
}

const TabsList = ({ className, ref, ...props }: TabsListProps) => (
  <TabsPrimitive.List
    ref={ref}
    className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}
    {...props}
  />
);

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.Trigger>>;
}

const TabsTrigger = ({ className, ref, ...props }: TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={`inline-flex items-center justify-center rounded-sm px-4 py-1.5 text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 ${className}`}
    {...props}
  />
);

export interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  ref?: React.Ref<React.ElementRef<typeof TabsPrimitive.Content>>;
}

const TabsContent = ({ className, ref, ...props }: TabsContentProps) => (
  <TabsPrimitive.Content
    ref={ref}
    className={`mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95 ${className}`}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
