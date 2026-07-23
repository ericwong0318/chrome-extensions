import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FactCheck from './FactCheck';
import { mockChromeStorage } from '../test/setup';

describe('FactCheck UI', () => {
  beforeEach(() => {
    (global as Record<string, unknown>).chrome = { storage: mockChromeStorage };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows loading state, stage updates, and renders a final result', async () => {
    await mockChromeStorage.sync.set({
      factCheckConfigs: [
        {
          provider: 'OpenAI',
          apiKey: 'fake',
          model: 'gpt-4o-mini',
          language: 'en',
        },
      ],
      factCheckTimeoutSec: 9,
    });

    const onFactCheck = vi.fn(
      (text: string, onStage?: (stage: string, isRetry?: boolean) => void) => {
        return new Promise((resolve) => {
          window.setTimeout(() => {
            onStage?.('Contacting AI provider…', false);
          }, 50);
          window.setTimeout(
            () =>
              resolve({
                validityVsTruth: 'The claim is mostly unsupported.',
                rhetoric: { ethos: 'Moderate', pathos: 'Low', logos: 'Medium' },
                fallacies: [],
                verdict: 'credible',
                provider: 'OpenAI',
              }),
            300,
          );
        });
      },
    ) as unknown as React.ComponentProps<typeof FactCheck>['onFactCheck'];

    render(
      <FactCheck
        text="Some test text"
        enabled={true}
        onFactCheck={onFactCheck}
      />,
    );

    const button = screen.getByRole('button', { name: /fact check/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toBeInTheDocument(),
    );

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow');

    await waitFor(() =>
      expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0),
    );
    await waitFor(() =>
      expect(screen.getByText(/Contacting/i)).toBeInTheDocument(),
    );
    await waitFor(
      () => expect(screen.getByText(/Credible/i)).toBeInTheDocument(),
      { timeout: 1000 },
    );
    expect(screen.getByText(/via OpenAI/i)).toBeInTheDocument();
    expect(onFactCheck).toHaveBeenCalledWith(
      'Some test text',
      expect.any(Function),
    );
  });

  it('resets progress and shows retry stage when the provider callback reports a retry', async () => {
    await mockChromeStorage.sync.set({
      factCheckConfigs: [
        {
          provider: 'OpenAI',
          apiKey: 'fake',
          model: 'gpt-4o-mini',
          language: 'en',
        },
      ],
      factCheckTimeoutSec: 9,
    });

    let stageCallback: ((stage: string, isRetry?: boolean) => void) | undefined;
    const onFactCheck = vi.fn(
      (text: string, onStage?: (stage: string, isRetry?: boolean) => void) => {
        stageCallback = onStage;
        return new Promise((resolve) => {
          window.setTimeout(() => {
            stageCallback?.('Contacting AI provider…', false);
          }, 50);
          window.setTimeout(
            () =>
              resolve({
                validityVsTruth: 'The claim has mixed evidence.',
                rhetoric: { ethos: 'Low', pathos: 'Medium', logos: 'High' },
                fallacies: [],
                verdict: 'misleading',
                provider: 'OpenAI',
              }),
            400,
          );
        });
      },
    ) as unknown as React.ComponentProps<typeof FactCheck>['onFactCheck'];

    render(
      <FactCheck
        text="Retry test text"
        enabled={true}
        onFactCheck={onFactCheck}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /fact check/i }));
    await waitFor(() =>
      expect(screen.getByRole('progressbar')).toBeInTheDocument(),
    );

    const progress = screen.getByRole('progressbar');
    await waitFor(() =>
      expect(Number(progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0),
    );

    expect(stageCallback).toBeDefined();
    act(() => {
      stageCallback?.('Contacting AI provider…', true);
    });

    expect(
      await screen.findByText(/Retrying with another provider…/i),
    ).toBeInTheDocument();
    expect(Number(progress.getAttribute('aria-valuenow'))).toBe(0);

    await waitFor(
      () => expect(screen.getByText(/Misleading/i)).toBeInTheDocument(),
      { timeout: 1000 },
    );
  });
});