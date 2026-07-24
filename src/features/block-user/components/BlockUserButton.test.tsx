import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlockButton } from './BlockUserButton';

describe('BlockButton', () => {
  const mockOnBlock = vi.fn();
  const mockOnUnblock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should render Block button when not blocked', () => {
    render(<BlockButton isBlocked={false} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    expect(screen.getByText('Block')).toBeInTheDocument();
    expect(screen.queryByText('Unblock')).not.toBeInTheDocument();
  });

  it('should render Unblock button when blocked', () => {
    render(<BlockButton isBlocked={true} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    expect(screen.getByText('Unblock')).toBeInTheDocument();
    expect(screen.queryByText('Block')).not.toBeInTheDocument();
  });

  it('should call onBlock when Block button is clicked', () => {
    render(<BlockButton isBlocked={false} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    act(() => {
      screen.getByText('Block').click();
    });

    expect(mockOnBlock).toHaveBeenCalledTimes(1);
    expect(mockOnUnblock).not.toHaveBeenCalled();
  });

  it('should call onUnblock when Unblock button is clicked', () => {
    render(<BlockButton isBlocked={true} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    act(() => {
      screen.getByText('Unblock').click();
    });

    expect(mockOnUnblock).toHaveBeenCalledTimes(1);
    expect(mockOnBlock).not.toHaveBeenCalled();
  });

  it('should have correct button variants for Block button', () => {
    const { container } = render(<BlockButton isBlocked={false} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    // Block button should be contained and error color (MUI adds CSS classes)
    const blockButton = container.querySelector('button');
    expect(blockButton).toHaveClass('MuiButton-contained');
    expect(blockButton).toHaveClass('MuiButton-colorError');
  });

  it('should have correct button variants for Unblock button', () => {
    const { container } = render(<BlockButton isBlocked={true} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    // Unblock button should be text and secondary color (MUI adds CSS classes)
    const unblockButton = container.querySelector('button');
    expect(unblockButton).toHaveClass('MuiButton-text');
    expect(unblockButton).toHaveClass('MuiButton-colorSecondary');
  });

  it('should have small size for both buttons', () => {
    const { container: container1 } = render(<BlockButton isBlocked={false} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    const { container: container2 } = render(<BlockButton isBlocked={true} onBlock={mockOnBlock} onUnblock={mockOnUnblock} />);
    
    expect(container1.querySelector('button')).toHaveClass('MuiButton-sizeSmall');
    expect(container2.querySelector('button')).toHaveClass('MuiButton-sizeSmall');
  });
});
