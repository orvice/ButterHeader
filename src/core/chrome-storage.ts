import type { KVStorage } from './config-store';

/** Config Store 在生产环境的适配器：chrome.storage.sync（ADR 0002） */
export const chromeSyncStorage: KVStorage = {
  get: () => chrome.storage.sync.get(null),
  set: (items) => chrome.storage.sync.set(items),
  remove: (keys) => chrome.storage.sync.remove(keys),
  onChanged: (listener) => chrome.storage.sync.onChanged.addListener(listener),
};
