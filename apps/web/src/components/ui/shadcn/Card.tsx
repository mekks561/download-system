import * as React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

const Card = ({ className, ref, ...props }: CardProps) => (
  <div
    ref={ref}
    className={`rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
    {...props}
  />
);

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

const CardHeader = ({ className, ref, ...props }: CardHeaderProps) => (
  <div ref={ref} className={`flex flex-col space-y-2 px-6 py-4 ${className}`} {...props} />
);

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  ref?: React.Ref<HTMLHeadingElement>;
}

const CardTitle = ({ className, ref, ...props }: CardTitleProps) => (
  <h3 ref={ref} className={`text-lg font-semibold text-gray-900 leading-none ${className}`} {...props} />
);

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  ref?: React.Ref<HTMLParagraphElement>;
}

const CardDescription = ({ className, ref, ...props }: CardDescriptionProps) => (
  <p ref={ref} className={`text-sm text-gray-500 ${className}`} {...props} />
);

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

const CardContent = ({ className, ref, ...props }: CardContentProps) => (
  <div ref={ref} className={`px-6 py-4 ${className}`} {...props} />
);

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
}

const CardFooter = ({ className, ref, ...props }: CardFooterProps) => (
  <div ref={ref} className={`flex items-center px-6 py-4 ${className}`} {...props} />
);

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
