import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from './compile';
import { createConfigStore, type KVStorage } from './config-store';

const profile = (id: string, name: string): Profile => ({
  id,
  name,
  enabled: true,
  domains: [],
  rules: [],
});

/** 内存假适配器：第二个 adapter，让 seam 成为真实的 */
function fakeStorage(initial: Record<string, unknown> = {}) {
  let data: Record<string, unknown> = { ...initial };
  let setError: Error | null = null;
  const listeners: Array<() => void> = [];
  const notify = () => listeners.forEach((l) => l());
  return {
    adapter: {
      get: async () => ({ ...data }),
      set: async (items: Record<string, unknown>) => {
        if (setError) throw setError;
        Object.assign(data, items);
        notify();
      },
      remove: async (keys: string[]) => {
        for (const k of keys) delete data[k];
        notify();
      },
      onChanged: (listener: () => void) => {
        listeners.push(listener);
      },
    } satisfies KVStorage,
    /** 模拟外部修改（其他界面 / 其他设备），同样触发 onChanged */
    external(mutate: (data: Record<string, unknown>) => void) {
      mutate(data);
      notify();
    },
    dump: () => ({ ...data }),
    failSetsWith(error: Error | null) {
      setError = error;
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createConfigStore', () => {
  it('initializes its snapshot from stored keys, respecting profileOrder', async () => {
    const { adapter } = fakeStorage({
      globalPause: true,
      profileOrder: ['b', 'a'],
      'profile:a': profile('a', 'Alpha'),
      'profile:b': profile('b', 'Beta'),
    });

    const store = await createConfigStore(adapter);

    expect(store.getState().config).toEqual({
      globalPause: true,
      profiles: [profile('b', 'Beta'), profile('a', 'Alpha')],
    });
    expect(store.getState().saveError).toBeNull();
  });

  it('applies updateProfile to the snapshot immediately and persists one coalesced write after the debounce window', async () => {
    const fake = fakeStorage({ profileOrder: ['a'], 'profile:a': profile('a', 'Alpha') });
    const store = await createConfigStore(fake.adapter, { debounceMs: 500 });

    store.updateProfile(profile('a', 'Al'));
    store.updateProfile(profile('a', 'Alp'));
    store.updateProfile(profile('a', 'Alpine'));

    expect(store.getState().config.profiles[0].name).toBe('Alpine');
    expect(fake.dump()['profile:a']).toEqual(profile('a', 'Alpha'));

    await vi.advanceTimersByTimeAsync(500);
    expect(fake.dump()['profile:a']).toEqual(profile('a', 'Alpine'));
  });

  it('applies a foreign change per key: pending local edits win, other profiles and globalPause update, subscriber notified', async () => {
    const fake = fakeStorage({
      globalPause: false,
      profileOrder: ['a', 'b'],
      'profile:a': profile('a', 'Alpha'),
      'profile:b': profile('b', 'Beta'),
    });
    const store = await createConfigStore(fake.adapter, { debounceMs: 500 });
    const onChange = vi.fn();
    store.subscribe(onChange);

    store.updateProfile(profile('a', 'Alpha-edited'));
    onChange.mockClear();

    fake.external((data) => {
      data.globalPause = true;
      data['profile:a'] = { ...profile('a', 'Alpha-foreign') };
      data['profile:b'] = { ...profile('b', 'Beta-foreign') };
    });
    await vi.advanceTimersByTimeAsync(0);

    const { config } = store.getState();
    expect(config.globalPause).toBe(true);
    expect(config.profiles.find((p) => p.id === 'a')!.name).toBe('Alpha-edited');
    expect(config.profiles.find((p) => p.id === 'b')!.name).toBe('Beta-foreign');
    expect(onChange).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect((fake.dump()['profile:a'] as Profile).name).toBe('Alpha-edited');
  });

  it('does not re-notify subscribers when its own write echoes back through onChanged', async () => {
    const fake = fakeStorage({ profileOrder: ['a'], 'profile:a': profile('a', 'Alpha') });
    const store = await createConfigStore(fake.adapter, { debounceMs: 500 });
    const onChange = vi.fn();
    store.subscribe(onChange);

    store.updateProfile(profile('a', 'Alpine'));
    expect(onChange).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('persists addProfile immediately (no debounce) with the profile appended to the order', async () => {
    const fake = fakeStorage({ profileOrder: ['a'], 'profile:a': profile('a', 'Alpha') });
    const store = await createConfigStore(fake.adapter);

    store.addProfile(profile('n', 'New'));
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getState().config.profiles.map((p) => p.id)).toEqual(['a', 'n']);
    expect(fake.dump().profileOrder).toEqual(['a', 'n']);
    expect(fake.dump()['profile:n']).toEqual(profile('n', 'New'));
  });

  it('removeProfile deletes the key and order entry immediately, and cancels any pending edit for that profile', async () => {
    const fake = fakeStorage({
      profileOrder: ['a', 'b'],
      'profile:a': profile('a', 'Alpha'),
      'profile:b': profile('b', 'Beta'),
    });
    const store = await createConfigStore(fake.adapter, { debounceMs: 500 });

    store.updateProfile(profile('a', 'Alpha-edited'));
    store.removeProfile('a');
    await vi.advanceTimersByTimeAsync(500);

    expect(store.getState().config.profiles.map((p) => p.id)).toEqual(['b']);
    expect(fake.dump()['profile:a']).toBeUndefined();
    expect(fake.dump().profileOrder).toEqual(['b']);
  });

  it('reorder rearranges the snapshot and persists the new order immediately', async () => {
    const fake = fakeStorage({
      profileOrder: ['a', 'b'],
      'profile:a': profile('a', 'Alpha'),
      'profile:b': profile('b', 'Beta'),
    });
    const store = await createConfigStore(fake.adapter);

    store.reorder(['b', 'a']);
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getState().config.profiles.map((p) => p.id)).toEqual(['b', 'a']);
    expect(fake.dump().profileOrder).toEqual(['b', 'a']);
  });

  it('setGlobalPause updates the snapshot and persists immediately', async () => {
    const fake = fakeStorage({ profileOrder: [] });
    const store = await createConfigStore(fake.adapter);

    store.setGlobalPause(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getState().config.globalPause).toBe(true);
    expect(fake.dump().globalPause).toBe(true);
  });

  it('exposes a failed save as saveError state with the profile name, cleared by the next successful write', async () => {
    const fake = fakeStorage({ profileOrder: ['a'], 'profile:a': profile('a', 'Alpha') });
    const store = await createConfigStore(fake.adapter, { debounceMs: 500 });
    const onChange = vi.fn();
    store.subscribe(onChange);

    fake.failSetsWith(new Error('QUOTA_BYTES_PER_ITEM quota exceeded'));
    store.updateProfile(profile('a', 'Huge'));
    await vi.advanceTimersByTimeAsync(500);

    expect(store.getState().saveError).toEqual({
      message: 'QUOTA_BYTES_PER_ITEM quota exceeded',
      profileName: 'Huge',
    });
    expect(store.getState().config.profiles[0].name).toBe('Huge');

    fake.failSetsWith(null);
    store.updateProfile(profile('a', 'Trimmed'));
    await vi.advanceTimersByTimeAsync(500);

    expect(store.getState().saveError).toBeNull();
    expect((fake.dump()['profile:a'] as Profile).name).toBe('Trimmed');
  });

  it('importProfiles appends all imported profiles in a single atomic write; invalid JSON throws and changes nothing', async () => {
    const fake = fakeStorage({ profileOrder: ['a'], 'profile:a': profile('a', 'Alpha') });
    const store = await createConfigStore(fake.adapter);
    const setSpy = vi.spyOn(fake.adapter, 'set');

    const json = JSON.stringify({
      version: 1,
      profiles: [profile('x', 'ImpOne'), profile('y', 'ImpTwo')],
    });
    store.importProfiles(json);
    await vi.advanceTimersByTimeAsync(0);

    expect(setSpy).toHaveBeenCalledTimes(1);
    const names = store.getState().config.profiles.map((p) => p.name);
    expect(names).toEqual(['Alpha', 'ImpOne', 'ImpTwo']);
    expect(fake.dump().profileOrder).toEqual(store.getState().config.profiles.map((p) => p.id));

    expect(() => store.importProfiles('{"version":99}')).toThrow(/version/i);
    expect(store.getState().config.profiles).toHaveLength(3);
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps snapshot identity stable between changes and fresh after a change (useSyncExternalStore contract)', async () => {
    const fake = fakeStorage({ profileOrder: ['a'], 'profile:a': profile('a', 'Alpha') });
    const store = await createConfigStore(fake.adapter);

    const before = store.getState();
    expect(store.getState()).toBe(before);

    store.setGlobalPause(true);
    expect(store.getState()).not.toBe(before);
  });

  it('updateProfile with flush persists immediately, including any other pending edits (toggle semantics)', async () => {
    const fake = fakeStorage({
      profileOrder: ['a', 'b'],
      'profile:a': profile('a', 'Alpha'),
      'profile:b': profile('b', 'Beta'),
    });
    const store = await createConfigStore(fake.adapter, { debounceMs: 500 });

    store.updateProfile(profile('b', 'Beta-typing'));
    store.updateProfile({ ...profile('a', 'Alpha'), enabled: false }, { flush: true });
    await vi.advanceTimersByTimeAsync(0);

    expect((fake.dump()['profile:a'] as Profile).enabled).toBe(false);
    expect((fake.dump()['profile:b'] as Profile).name).toBe('Beta-typing');
  });
});
