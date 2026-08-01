import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';

export type AccordionProps = React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Root>>;
};

const Accordion = ({ className, ref, ...props }: AccordionProps) => (
  <AccordionPrimitive.Root
    ref={ref}
    className={`space-y-1 ${className}`}
    {...props}
  />
);

export interface AccordionItemProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Item>>;
}

const AccordionItem = ({ className, ref, ...props }: AccordionItemProps) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={`border-b border-gray-100 ${className}`}
    {...props}
  />
);

export interface AccordionHeaderProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Header> {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Header>>;
}

const AccordionHeader = ({ className, ref, ...props }: AccordionHeaderProps) => (
  <AccordionPrimitive.Header
    ref={ref}
    className={`flex ${className}`}
    {...props}
  />
);

export interface AccordionTriggerProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Trigger>>;
}

const AccordionTrigger = ({ className: _className, children, ref, ...props }: AccordionTriggerProps) => (
  <AccordionPrimitive.Trigger
    ref={ref}
    className="flex flex-1 items-center justify-between py-4 text-left text-sm font-medium text-gray-900 transition-colors hover:text-primary-600 [&[data-state=open]>svg]:rotate-180"
    {...props}
  >
    {children}
    <svg className="h-4 w-4 shrink-0 text-gray-500 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </AccordionPrimitive.Trigger>
);

export interface AccordionContentProps extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {
  ref?: React.Ref<React.ElementRef<typeof AccordionPrimitive.Content>>;
}

const AccordionContent = ({ className, children, ref, ...props }: AccordionContentProps) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm text-gray-600 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2"
    {...props}
  >
    <div className={`pb-4 ${className}`}>{children}</div>
  </AccordionPrimitive.Content>
);

export { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionContent };
