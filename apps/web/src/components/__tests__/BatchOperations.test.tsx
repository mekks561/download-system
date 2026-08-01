import { render, screen, fireEvent } from '@testing-library/react';
import BatchOperations, { SelectableTask } from '../BatchOperations';

const createMockTasks = (count: number, status: string): SelectableTask[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `task-${i}`,
    filename: `file-${i}.txt`,
    status: status as SelectableTask['status'],
    selected: false,
  }));
};

describe('BatchOperations Component', () => {
  const mockOnBatchStart = vi.fn();
  const mockOnBatchPause = vi.fn();
  const mockOnBatchResume = vi.fn();
  const mockOnBatchCancel = vi.fn();
  const mockOnBatchDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with no tasks', () => {
    render(
      <BatchOperations
        tasks={[]}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(selectAllCheckbox.disabled).toBe(true);
  });

  it('should render with tasks', () => {
    const tasks = createMockTasks(3, 'completed');
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getByText(/全选/)).toBeTruthy();
  });

  it('should select all tasks when checkbox is checked', () => {
    const tasks = createMockTasks(3, 'completed');
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox');
    fireEvent.click(selectAllCheckbox);

    expect(tasks.every(t => t.selected)).toBe(true);
  });

  it('should deselect all tasks when checkbox is unchecked', () => {
    const tasks = createMockTasks(3, 'completed');
    tasks.forEach(t => t.selected = true);
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const selectAllCheckbox = screen.getByRole('checkbox');
    fireEvent.click(selectAllCheckbox);

    expect(tasks.every(t => !t.selected)).toBe(true);
  });

  it('should show selected count when tasks are selected', () => {
    const tasks = createMockTasks(3, 'completed');
    tasks[0].selected = true;
    tasks[1].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getByText(/已选择/)).toBeTruthy();
  });

  it('should show batch operations button when tasks are selected', () => {
    const tasks = createMockTasks(3, 'completed');
    tasks[0].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const batchButton = screen.getByText(/批量操作/) as HTMLButtonElement;
    expect(batchButton.disabled).toBe(false);
  });

  it('should disable batch operations button when no tasks are selected', () => {
    const tasks = createMockTasks(3, 'completed');
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const batchButton = screen.getByText(/批量操作/) as HTMLButtonElement;
    expect(batchButton.disabled).toBe(true);
  });

  it('should show delete action', () => {
    const tasks = createMockTasks(3, 'completed');
    tasks[0].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getAllByText(/删除/).length).toBeGreaterThan(0);
  });

  it('should show start action for pending tasks', () => {
    const tasks = createMockTasks(2, 'pending');
    tasks[0].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getAllByText(/开始/).length).toBeGreaterThan(0);
  });

  it('should show pause action for downloading tasks', () => {
    const tasks = createMockTasks(2, 'downloading');
    tasks[0].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getAllByText(/暂停/).length).toBeGreaterThan(0);
  });

  it('should show resume action for paused tasks', () => {
    const tasks = createMockTasks(2, 'paused');
    tasks[0].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getAllByText(/继续/).length).toBeGreaterThan(0);
  });

  it('should show cancel action for pending tasks', () => {
    const tasks = createMockTasks(2, 'pending');
    tasks[0].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    expect(screen.getAllByText(/取消/).length).toBeGreaterThan(0);
  });

  it('should clear selection when clear button is clicked', () => {
    const tasks = createMockTasks(3, 'completed');
    tasks[0].selected = true;
    tasks[1].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const clearButton = screen.getByText(/清除选择/);
    fireEvent.click(clearButton);

    expect(tasks.every(t => !t.selected)).toBe(true);
  });

  it('should show badge with selected count', () => {
    const tasks = createMockTasks(5, 'completed');
    tasks[0].selected = true;
    tasks[1].selected = true;
    
    render(
      <BatchOperations
        tasks={tasks}
        onBatchStart={mockOnBatchStart}
        onBatchPause={mockOnBatchPause}
        onBatchResume={mockOnBatchResume}
        onBatchCancel={mockOnBatchCancel}
        onBatchDelete={mockOnBatchDelete}
      />
    );

    const batchButton = screen.getByText(/批量操作/);
    const badge = batchButton.querySelector('span');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('2');
  });
});