import type { Profile } from './compile';

/**
 * 防抖合并写入（ADR 0002）：chrome.storage.sync 有
 * MAX_WRITE_OPERATIONS_PER_MINUTE 限制，连续编辑只保留每个 Profile 的最新值，
 * 延迟窗口结束后一次写入。
 */
export interface ProfileSaver {
  enqueue(profile: Profile): void;
}

export function createProfileSaver(opts: {
  save: (profile: Profile) => Promise<void>;
  delayMs: number;
  onError: (error: unknown, unsaved: Profile) => void;
}): ProfileSaver {
  const pending = new Map<string, Profile>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    for (const profile of pending.values()) {
      opts.save(profile).catch((error) => opts.onError(error, profile));
    }
    pending.clear();
  };

  return {
    enqueue(profile) {
      pending.set(profile.id, profile);
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(flush, opts.delayMs);
    },
  };
}
