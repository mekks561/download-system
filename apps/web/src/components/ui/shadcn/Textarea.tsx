import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: React.Ref<HTMLTextAreaElement>;
}

const Textarea = ({ className, ref, ...props }: TextareaProps) => (
  <textarea
    ref={ref}
    className={`flex min-h-[80px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 outline-none ring-offset-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
    {...props}
  />
);

export { Textarea };
