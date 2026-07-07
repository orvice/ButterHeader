import type { Config, Profile } from './compile';

/**
 * chrome.storage.sync 布局（ADR 0002：每个 Profile 独立 key，规避 8KB/key 上限）：
 * - globalPause: boolean
 * - profileOrder: string[]        // 冲突覆盖顺序
 * - profile:<id>: Profile
 */
const PROFILE_PREFIX = 'profile:';

export async function loadConfig(): Promise<Config> {
  const all = await chrome.storage.sync.get(null);
  const order: string[] = all.profileOrder ?? [];
  const profiles = order
    .map((id) => all[PROFILE_PREFIX + id] as Profile | undefined)
    .filter((p): p is Profile => p !== undefined);
  return { globalPause: all.globalPause ?? false, profiles };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const { profileOrder = [] } = await chrome.storage.sync.get('profileOrder');
  const updates: Record<string, unknown> = { [PROFILE_PREFIX + profile.id]: profile };
  if (!profileOrder.includes(profile.id)) {
    updates.profileOrder = [...profileOrder, profile.id];
  }
  await chrome.storage.sync.set(updates);
}
