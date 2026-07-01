import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Tabs from './Tabs';

const tabs = [
  { key: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { key: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  { key: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
];

describe('Tabs Component', () => {
  test('renders tabs correctly', () => {
    render(<Tabs tabs={tabs} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
  });

  test('shows first tab content by default', () => {
    render(<Tabs tabs={tabs} />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  test('shows active tab with correct styling', () => {
    render(<Tabs tabs={tabs} activeKey="tab2" />);
    const activeTab = screen.getByRole('tab', { selected: true });
    expect(activeTab).toHaveTextContent('Tab 2');
  });

  test('does not switch to disabled tab', () => {
    const disabledTabs = [
      ...tabs.slice(0, 2),
      { key: 'tab3', label: 'Tab 3', disabled: true, content: <div>Content 3</div> },
    ];
    render(<Tabs tabs={disabledTabs} />);
    
    const disabledTab = screen.getByRole('tab', { name: 'Tab 3' });
    expect(disabledTab).toBeDisabled();
  });

  test('renders with card variant', () => {
    const { container } = render(<Tabs tabs={tabs} variant="card" />);
    const tabsContainer = container.querySelector('[role="tablist"]');
    expect(tabsContainer).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    const { container } = render(<Tabs tabs={tabs} className="custom-tabs" />);
    const tabsContainer = container.querySelector('[role="tablist"]');
    expect(tabsContainer).toBeInTheDocument();
  });
});