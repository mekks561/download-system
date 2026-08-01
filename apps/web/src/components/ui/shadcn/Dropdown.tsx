import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export interface DropdownMenuSubTriggerProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>>;
}

const DropdownMenuSubTrigger = ({ className, inset, children, ref, ...props }: DropdownMenuSubTriggerProps) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={`flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm text-gray-700 outline-none focus:bg-gray-100 data-[state=open]:bg-gray-100 ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  >
    {children}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto h-4 w-4 text-gray-400"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </DropdownMenuPrimitive.SubTrigger>
);

export interface DropdownMenuSubContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.SubContent>>;
}

const DropdownMenuSubContent = ({ className, ref, ...props }: DropdownMenuSubContentProps) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={`z-50 min-w-[180px] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
    {...props}
  />
);

export interface DropdownMenuContentProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> {
  sideOffset?: number;
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Content>>;
}

const DropdownMenuContent = ({ className, sideOffset = 4, ref, ...props }: DropdownMenuContentProps) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-50 min-w-[200px] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);

export interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Item>>;
}

const DropdownMenuItem = ({ className, inset, ref, ...props }: DropdownMenuItemProps) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={`relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm text-gray-700 transition-colors duration-150 outline-none focus:bg-gray-100 focus:text-gray-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  />
);

export interface DropdownMenuSeparatorProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Separator>>;
}

const DropdownMenuSeparator = ({ className, ref, ...props }: DropdownMenuSeparatorProps) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={`-mx-1 my-1 h-px bg-gray-200 ${className}`}
    {...props}
  />
);

export interface DropdownMenuLabelProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean;
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.Label>>;
}

const DropdownMenuLabel = ({ className, inset, ref, ...props }: DropdownMenuLabelProps) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={`px-3 py-1.5 text-xs font-semibold text-gray-500 ${inset ? 'pl-8' : ''} ${className}`}
    {...props}
  />
);

export interface DropdownMenuCheckboxItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> {
  ref?: React.Ref<React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>>;
}

const DropdownMenuCheckboxItem = ({ className, children, checked, ref, ...props }: DropdownMenuCheckboxItemProps) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={`relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
    {...props}
  >
    <DropdownMenuPrimitive.ItemIndicator className="mr-2 flex h-4 w-4 items-center justify-center">
      {checked && <span className="text-primary-600">✓</span>}
    </DropdownMenuPrimitive.ItemIndicator>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
