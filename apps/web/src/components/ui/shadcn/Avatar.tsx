import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  ref?: React.Ref<React.ElementRef<typeof AvatarPrimitive.Root>>;
}

const Avatar = ({ className, ref, ...props }: AvatarProps) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
    {...props}
  />
);

export interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  ref?: React.Ref<React.ElementRef<typeof AvatarPrimitive.Image>>;
}

const AvatarImage = ({ className, ref, ...props }: AvatarImageProps) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={`aspect-square h-full w-full object-cover ${className}`}
    {...props}
  />
);

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  ref?: React.Ref<React.ElementRef<typeof AvatarPrimitive.Fallback>>;
}

const AvatarFallback = ({ className, ref, ...props }: AvatarFallbackProps) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 ${className}`}
    {...props}
  />
);

export { Avatar, AvatarImage, AvatarFallback };
