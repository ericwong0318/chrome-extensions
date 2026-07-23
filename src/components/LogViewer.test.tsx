import {
  render,
  screen,
  fireEvent,
  cleanup,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LogViewer from './LogViewer';
import { mockChromeStorage } from '../test/setup';
import { logError, clearLogs } from '../utils/index';

beforeEach(async () => {
  (global as Record<string, unknown>).chrome = { storage: mockChromeStorage };
  await clearLogs();
});

afterEach(() => {
  cleanup();
});

describe('LogViewer', () => {
  it('shows empty state when no errors are logged', async () => {
    render(<LogViewer />);
    expect(await screen.findByText('No errors logged.')).toBeInTheDocument();
  });

  it('displays logged errors with level and message', async () => {
    await logError('boom', 'background');
    render(<LogViewer />);
    expect(await screen.findByText('boom (background)')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('clear log empties the displayed errors', async () => {
    await logError('boom', 'background');
    render(<LogViewer />);
    expect(await screen.findByText('boom (background)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear log'));
    expect(await screen.findByText('No errors logged.')).toBeInTheDocument();
  });
});