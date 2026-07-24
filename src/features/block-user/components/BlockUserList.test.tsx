import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlockUserList } from './BlockUserList';

describe('BlockUserList', () => {
  const mockOnUnblock = vi.fn();
  const mockOnClearAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should render empty state when no blocked users', () => {
    render(<BlockUserList blocked={[]} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    expect(screen.getByText('Block User List')).toBeInTheDocument();
    expect(screen.getByText('Manage the list of Zhihu users you have blocked.')).toBeInTheDocument();
    expect(screen.getByText('No users blocked.')).toBeInTheDocument();
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });

  it('should render list of blocked users', () => {
    const blockedUsers = [
      { id: 'user1', name: 'User One' },
      { id: 'user2', name: 'User Two' },
    ];
    
    render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
  });

  it('should render Clear all button when users exist', () => {
    const blockedUsers = [{ id: 'user1', name: 'User One' }];
    
    render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('should call onUnblock when Unblock button is clicked', () => {
    const blockedUsers = [{ id: 'user1', name: 'User One' }];
    
    render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    act(() => {
      screen.getByText('Unblock').click();
    });

    expect(mockOnUnblock).toHaveBeenCalledWith('user1');
    expect(mockOnClearAll).not.toHaveBeenCalled();
  });

  it('should call onClearAll when Clear all button is clicked', () => {
    const blockedUsers = [
      { id: 'user1', name: 'User One' },
      { id: 'user2', name: 'User Two' },
    ];
    
    render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    act(() => {
      screen.getByText('Clear all').click();
    });

    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
    expect(mockOnUnblock).not.toHaveBeenCalled();
  });

  it('should update local state when blocked prop changes', () => {
    const { rerender } = render(
      <BlockUserList blocked={[{ id: 'user1', name: 'User One' }]} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />
    );
    
    expect(screen.getByText('User One')).toBeInTheDocument();
    
    // Rerender with new blocked list
    rerender(
      <BlockUserList blocked={[{ id: 'user2', name: 'User Two' }]} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />
    );
    
    expect(screen.queryByText('User One')).not.toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('should have correct button variants', () => {
    const blockedUsers = [{ id: 'user1', name: 'User One' }];
    
    const { container } = render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    // Find buttons by text content
    const buttons = container.querySelectorAll('button');
    let clearAllButton: HTMLButtonElement | null = null;
    let unblockButton: HTMLButtonElement | null = null;
    
    buttons.forEach(btn => {
      if (btn.textContent?.includes('Clear all')) clearAllButton = btn;
      if (btn.textContent?.includes('Unblock')) unblockButton = btn;
    });
    
    // Clear all button should be outlined and error color
    expect(clearAllButton).toHaveClass('MuiButton-outlined');
    expect(clearAllButton).toHaveClass('MuiButton-colorError');
    
    // Unblock button should be text and secondary color
    expect(unblockButton).toHaveClass('MuiButton-text');
    expect(unblockButton).toHaveClass('MuiButton-colorSecondary');
  });

  it('should have small size for buttons', () => {
    const blockedUsers = [{ id: 'user1', name: 'User One' }];
    
    const { container } = render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    const buttons = container.querySelectorAll('button');
    let clearAllButton: HTMLButtonElement | null = null;
    let unblockButton: HTMLButtonElement | null = null;
    
    buttons.forEach(btn => {
      if (btn.textContent?.includes('Clear all')) clearAllButton = btn;
      if (btn.textContent?.includes('Unblock')) unblockButton = btn;
    });
    
    expect(clearAllButton).toHaveClass('MuiButton-sizeSmall');
    expect(unblockButton).toHaveClass('MuiButton-sizeSmall');
  });

  it('should show divider between list items', () => {
    const blockedUsers = [
      { id: 'user1', name: 'User One' },
      { id: 'user2', name: 'User Two' },
    ];
    
    render(<BlockUserList blocked={blockedUsers} onUnblock={mockOnUnblock} onClearAll={mockOnClearAll} />);
    
    // Should have a divider (hr element)
    const divider = screen.getByRole('separator');
    expect(divider).toBeInTheDocument();
  });
});