import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { chromeSyncStorage } from '@/src/core/chrome-storage';
import { createConfigStore, type ConfigStore, type ConfigStoreState } from '@/src/core/config-store';

let storePromise: Promise<ConfigStore> | null = null;

/** 各界面绑定 Config Store 的薄适配器；同一 JS 上下文共享一个 store 实例 */
export function useConfigStore(): { store: ConfigStore; state: ConfigStoreState } | null {
  const [store, setStore] = useState<ConfigStore | null>(null);

  useEffect(() => {
    storePromise ??= createConfigStore(chromeSyncStorage);
    void storePromise.then(setStore);
  }, []);

  const subscribe = useCallback(
    (onChange: () => void) => (store ? store.subscribe(onChange) : () => {}),
    [store],
  );
  const state = useSyncExternalStore(subscribe, () => (store ? store.getState() : null));

  return store && state ? { store, state } : null;
}
