import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlockUsersControl } from './BlockUsersControl';
import { useBlockUser } from '../hooks/useBlockUser';

// Mock the useBlockUser hook
vi.mock('../hooks/useBlockUser', () => ({
  useBlockUser: vi.fn(),
  INLINE_CLASS: 'zhihu-block-inline',
}));

describe('BlockUsersControl', () => {
  const mockBlockUser = vi.fn();
  const mockUnblockUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    
    // Default mock for useBlockUser
    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function createMockUser(id: string, name: string, hasContainer = true) {
    const element = document.createElement('a');
    const parent = document.createElement('div');
    parent.appendChild(element);
    
    if (hasContainer) {
      const container = document.createElement('span');
      container.className = 'zhihu-block-inline';
      container.setAttribute('data-userid', id);
      parent.appendChild(container);
    }
    
    return { id, name, element };
  }

  it('should render nothing when no users found', () => {
    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    // Should render an empty Box
    const box = screen.getByTestId('block-users-control');
    expect(box).toBeInTheDocument();
  });

  it('should render BlockButton for each user with content container', () => {
    const mockUser = createMockUser('https://www.zhihu.com/people/testuser', 'Test User');

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [mockUser],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    // Should render a button for the user
    expect(screen.getByText('Block')).toBeInTheDocument();
  });

  it('should show Unblock button for already blocked user', () => {
    const mockUser = createMockUser('https://www.zhihu.com/people/testuser', 'Test User');

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [{ id: 'https://www.zhihu.com/people/testuser', name: 'Test User' }],
      users: [mockUser],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    // Should render Unblock button for blocked user
    expect(screen.getByText('Unblock')).toBeInTheDocument();
  });

  it('should call blockUser when Block button is clicked', () => {
    const mockUser = createMockUser('https://www.zhihu.com/people/testuser', 'Test User');

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [mockUser],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    act(() => {
      screen.getByText('Block').click();
    });

    expect(mockBlockUser).toHaveBeenCalledWith(
      'https://www.zhihu.com/people/testuser',
      'Test User'
    );
  });

  it('should call unblockUser when Unblock button is clicked', () => {
    const mockUser = createMockUser('https://www.zhihu.com/people/testuser', 'Test User');

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [{ id: 'https://www.zhihu.com/people/testuser', name: 'Test User' }],
      users: [mockUser],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    act(() => {
      screen.getByText('Unblock').click();
    });

    expect(mockUnblockUser).toHaveBeenCalledWith(
      'https://www.zhihu.com/people/testuser'
    );
  });

  it('should skip users without parent element', () => {
    const mockUser = {
      id: 'https://www.zhihu.com/people/testuser',
      name: 'Test User',
      element: document.createElement('a'),
      // No parentElement - element not attached to DOM
    };

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [mockUser],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    // Should not render any buttons
    expect(screen.queryByText('Block')).not.toBeInTheDocument();
  });

  it('should skip users without inline container', () => {
    const mockUser = createMockUser('https://www.zhihu.com/people/testuser', 'Test User', false);

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [mockUser],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    // Should not render any buttons
    expect(screen.queryByText('Block')).not.toBeInTheDocument();
  });

  it('should handle multiple users', () => {
    const mockUser1 = createMockUser('https://www.zhihu.com/people/user1', 'User One');
    const mockUser2 = createMockUser('https://www.zhihu.com/people/user2', 'User Two');

    (useBlockUser as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      blocked: [],
      users: [mockUser1, mockUser2],
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    });

    render(<BlockUsersControl />);
    
    // Should render buttons for both users
    expect(screen.getAllByText('Block')).toHaveLength(2);
  });
});
