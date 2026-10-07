import * as React from 'react';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  ref?: React.Ref<HTMLTableElement>;
}

const Table = ({ className, ref, ...props }: TableProps) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  ref?: React.Ref<HTMLTableSectionElement>;
}

const TableHeader = ({ className, ref, ...props }: TableHeaderProps) => (
  <thead ref={ref} className={`border-b border-gray-200 ${className}`} {...props} />
);

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  ref?: React.Ref<HTMLTableSectionElement>;
}

const TableBody = ({ className, ref, ...props }: TableBodyProps) => (
  <tbody ref={ref} className={`divide-y divide-gray-100 ${className}`} {...props} />
);

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  ref?: React.Ref<HTMLTableSectionElement>;
}

const TableFooter = ({ className, ref, ...props }: TableFooterProps) => (
  <tfoot ref={ref} className={`border-t border-gray-200 bg-gray-50 ${className}`} {...props} />
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  ref?: React.Ref<HTMLTableRowElement>;
}

const TableRow = ({ className, ref, ...props }: TableRowProps) => (
  <tr ref={ref} className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${className}`} {...props} />
);

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  ref?: React.Ref<HTMLTableCellElement>;
}

const TableHead = ({ className, ref, ...props }: TableHeadProps) => (
  <th ref={ref} className={`text-left font-medium text-gray-900 px-4 py-3 ${className}`} {...props} />
);

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  ref?: React.Ref<HTMLTableCellElement>;
}

const TableCell = ({ className, ref, ...props }: TableCellProps) => (
  <td ref={ref} className={`px-4 py-3 text-gray-700 ${className}`} {...props} />
);

export interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  ref?: React.Ref<HTMLTableCaptionElement>;
}

const TableCaption = ({ className, ref, ...props }: TableCaptionProps) => (
  <caption ref={ref} className={`mt-4 text-sm text-gray-500 ${className}`} {...props} />
);

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption };
