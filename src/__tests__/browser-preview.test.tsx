import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserPreview } from '@/components/preview/browser-preview';
import { useGenerationStore } from '@/store/generation-store';

describe('BrowserPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGenerationStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    useGenerationStore.getState().reset();
  });

  it('shows an error instead of spinning forever when compilation hangs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            reject(error);
          });
        });
      }),
    );

    await act(async () => {
      useGenerationStore.getState().loadFromProjectFiles({
        'app/page.tsx': 'export default function Home() { return <main>Hello preview</main>; }',
      });

      render(<BrowserPreview />);
      await Promise.resolve();
    });

    expect(screen.getByText('Compiling Preview')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(20_000);
      await Promise.resolve();
    });

    expect(screen.getByText('Compilation Failed')).toBeInTheDocument();
    expect(screen.getAllByText(/Preview compile timed out after 20s/)).toHaveLength(2);
  });
});
