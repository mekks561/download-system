import React from 'react';
import { Table as ShadcnTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from './shadcn/Table';

export interface TableColumn<T extends object> {
  key: keyof T;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface TableProps<T extends object> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

const alignClasses: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const Table = <T extends object>({
  data,
  columns,
  loading = false,
  emptyText = '暂无数据',
  className = '',
}: TableProps<T>) => {
  return (
    <ShadcnTable className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={String(column.key)} style={{ width: column.width }} className={alignClasses[column.align || 'left']}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
              {emptyText}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => {
                const value = row[column.key];
                const content = column.render
                  ? column.render(value, row)
                  : String(value ?? '');

                return (
                  <TableCell key={String(column.key)} className={alignClasses[column.align || 'left']}>
                    {content}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </ShadcnTable>
  );
};

export default Table;