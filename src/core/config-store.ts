import type { Config, Profile } from './compile';
import { parseImport } from './transfer';

/**
 * Config Store（ADR 0003）：各界面读写配置的唯一入口。
 * 内存快照为单一事实来源；chrome.storage 的 key 布局（ADR 0002）是本模块私有实现。
 */

/** chrome.storage.sync 形状的最小 KV 适配器 */
export interface KVStorage {
  get(): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  onChanged(listener: () => void): void;
}

export interface SaveError {
  message: string;
  profileName: string;
}

export interface ConfigStoreState {
  config: Config;
  saveError: SaveError | null;
}

export interface ConfigStore {
  getState(): ConfigStoreState;
  subscribe(listener: () => void): () => void;
  /** 高频编辑：乐观更新快照，防抖合并落盘（每 Profile 只保留最新值）；flush 用于开关类离散操作，立即落盘 */
  updateProfile(profile: Profile, opts?: { flush?: boolean }): void;
  /** 低频操作立即落盘（单次批量写入） */
  addProfile(profile: Profile): void;
  removeProfile(id: string): void;
  /** 冲突覆盖顺序（Override by Order）即此列表顺序 */
  reorder(ids: string[]): void;
  setGlobalPause(paused: boolean): void;
  /** 导入追加合并（见 CONTEXT.md）：单次原子写入；非法 JSON 抛错且不改动任何状态 */
  importProfiles(json: string): void;
}

const PROFILE_PREFIX = 'profile:';

function parseSnapshot(all: Record<string, unknown>): Config {
  const order = (all.profileOrder as string[] | undefined) ?? [];
  const profiles = order
    .map((id) => all[PROFILE_PREFIX + id] as Profile | undefined)
    .filter((p): p is Profile => p !== undefined);
  return { globalPause: (all.globalPause as boolean | undefined) ?? false, profiles };
}

export async function createConfigStore(
  storage: KVStorage,
  opts: { debounceMs?: number } = {},
): Promise<ConfigStore> {
  const debounceMs = opts.debounceMs ?? 500;
  let state: ConfigStoreState = { config: parseSnapshot(await storage.get()), saveError: null };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  /** 状态不可变：每次变更整体换新对象，保证快照身份可比较（React useSyncExternalStore） */
  const setState = (patch: Partial<ConfigStoreState>) => {
    state = { ...state, ...patch };
    notify();
  };

  const pending = new Map<string, Profile>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * 协调（ADR 0003）：外部变更按 key 应用，待保存的 Profile 保留本地值。
   * 自身写入的回声经值相等判定后自然成为 no-op。
   */
  const reconcile = async () => {
    const external = parseSnapshot(await storage.get());
    const merged: Config = {
      globalPause: external.globalPause,
      profiles: external.profiles.map((p) => pending.get(p.id) ?? p),
    };
    if (JSON.stringify(merged) === JSON.stringify(state.config)) return;
    setState({ config: merged });
  };
  storage.onChanged(() => void reconcile());

  /** 写入结果进入可订阅状态：失败置 saveError（编辑内容保留在快照中），成功清除 */
  const write = (items: Record<string, unknown>, profileName: string) => {
    storage.set(items).then(
      () => {
        if (state.saveError !== null) setState({ saveError: null });
      },
      (error: unknown) => {
        setState({
          saveError: {
            message: error instanceof Error ? error.message : String(error),
            profileName,
          },
        });
      },
    );
  };

  const flush = () => {
    timer = undefined;
    for (const profile of pending.values()) {
      write({ [PROFILE_PREFIX + profile.id]: profile }, profile.name);
    }
    pending.clear();
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addProfile(profile) {
      setState({ config: { ...state.config, profiles: [...state.config.profiles, profile] } });
      void storage.set({
        [PROFILE_PREFIX + profile.id]: profile,
        profileOrder: state.config.profiles.map((p) => p.id),
      });
    },
    removeProfile(id) {
      pending.delete(id);
      setState({ config: {
        ...state.config,
        profiles: state.config.profiles.filter((p) => p.id !== id),
      } });
      void storage.set({ profileOrder: state.config.profiles.map((p) => p.id) });
      void storage.remove([PROFILE_PREFIX + id]);
    },
    reorder(ids) {
      const byId = new Map(state.config.profiles.map((p) => [p.id, p]));
      setState({ config: {
        ...state.config,
        profiles: ids.map((id) => byId.get(id)).filter((p): p is Profile => p !== undefined),
      } });
      void storage.set({ profileOrder: state.config.profiles.map((p) => p.id) });
    },
    setGlobalPause(paused) {
      setState({ config: { ...state.config, globalPause: paused } });
      void storage.set({ globalPause: paused });
    },
    importProfiles(json) {
      const imported = parseImport(json);
      setState({ config: { ...state.config, profiles: [...state.config.profiles, ...imported] } });
      const items: Record<string, unknown> = {
        profileOrder: state.config.profiles.map((p) => p.id),
      };
      for (const p of imported) items[PROFILE_PREFIX + p.id] = p;
      write(items, imported.map((p) => p.name).join(', '));
    },
    updateProfile(profile, opts) {
      setState({ config: {
        ...state.config,
        profiles: state.config.profiles.map((p) => (p.id === profile.id ? profile : p)),
      } });
      pending.set(profile.id, profile);
      if (timer !== undefined) clearTimeout(timer);
      if (opts?.flush) {
        flush();
      } else {
        timer = setTimeout(flush, debounceMs);
      }
    },
  };
}
