import React from 'react';
import { render, screen } from '@testing-library/react';
import Table from './Table';

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
}

const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
];

const columns: { key: keyof User; label: string; align?: 'left' | 'center' | 'right' }[] = [
  { key: 'id', label: 'ID', align: 'center' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
];

describe('Table Component', () => {
  test('renders table with data', () => {
    render(<Table data={mockUsers} columns={columns} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('renders headers correctly', () => {
    render(<Table data={mockUsers} columns={columns} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('shows empty state when data is empty', () => {
    render(<Table data={[]} columns={columns} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    const { container } = render(<Table data={[]} columns={columns} loading />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  test('supports custom render function', () => {
    const customColumns: { key: keyof User; label: string; align?: 'left' | 'center' | 'right'; render?: (value: User[keyof User]) => React.ReactNode }[] = [
      ...columns.slice(0, -1),
      {
        key: 'status',
        label: 'Status',
        render: (status) => (
          <span className={`status-${status}`}>{status}</span>
        ),
      },
    ];

    render(<Table data={mockUsers} columns={customColumns} />);
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  test('renders custom empty text', () => {
    render(<Table data={[]} columns={columns} emptyText="No records found" />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
  });
});