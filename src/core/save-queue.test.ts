import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from './compile';
import { createProfileSaver } from './save-queue';

const profile = (id: string, name: string): Profile => ({
  id,
  name,
  enabled: true,
  domains: [],
  rules: [],
});

describe('createProfileSaver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces rapid edits to the same profile into one save with the latest value', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createProfileSaver({ save, delayMs: 500, onError: vi.fn() });

    saver.enqueue(profile('p1', 'a'));
    saver.enqueue(profile('p1', 'ab'));
    saver.enqueue(profile('p1', 'abc'));
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(profile('p1', 'abc'));
  });

  it('saves the latest value of each distinct profile edited within the window', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createProfileSaver({ save, delayMs: 500, onError: vi.fn() });

    saver.enqueue(profile('p1', 'one'));
    saver.enqueue(profile('p2', 'two'));
    saver.enqueue(profile('p1', 'one-final'));

    await vi.advanceTimersByTimeAsync(500);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith(profile('p1', 'one-final'));
    expect(save).toHaveBeenCalledWith(profile('p2', 'two'));
  });

  it('reports a failed save through onError with the unsaved profile instead of losing it silently', async () => {
    const quotaError = new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
    const save = vi.fn().mockRejectedValue(quotaError);
    const onError = vi.fn();
    const saver = createProfileSaver({ save, delayMs: 500, onError });

    saver.enqueue(profile('p1', 'huge'));
    await vi.advanceTimersByTimeAsync(500);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(quotaError, profile('p1', 'huge'));
  });
});
