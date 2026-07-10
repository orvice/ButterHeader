import type { Profile } from '@/src/core/compile';
import { Button, Toggle } from '@/src/ui/components';
import { useConfigStore } from '@/src/ui/use-config-store';

/** 每个 Profile 的一句话摘要：规则数 · 重定向数 · 生效范围 */
function summarize(profile: Profile): string {
  const parts: string[] = [`${profile.rules.length} rule${profile.rules.length === 1 ? '' : 's'}`];
  const redirects = profile.redirects?.length ?? 0;
  if (redirects > 0) parts.push(`${redirects} redirect${redirects === 1 ? '' : 's'}`);
  const domains = profile.domains;
  parts.push(
    domains.length === 0
      ? 'all sites'
      : domains.length === 1
        ? domains[0]
        : `${domains.length} domains`,
  );
  return parts.join(' · ');
}

/** Popup 只承载高频开关，不做编辑（见 CONTEXT.md）；编辑一律在 Options 页 */
export function App() {
  const bound = useConfigStore();
  if (!bound) return null;
  const { store, state } = bound;
  const { config } = state;
  const paused = config.globalPause;
  const activeCount = config.profiles.filter((p) => p.enabled).length;

  return (
    <main className="w-80 text-sm text-slate-900 dark:text-slate-100">
      {/* 品牌头 */}
      <header className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-base leading-none">
          🧈
        </span>
        <span className="font-semibold">Butter Box</span>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {paused ? 'Paused' : `${activeCount} active`}
        </span>
      </header>

      <div className="p-3">
        {/* 全局暂停：醒目状态行，暂停时琥珀色 */}
        <div
          className={`flex items-center justify-between rounded-card px-3 py-2.5 ${
            paused
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
              : 'bg-slate-100 dark:bg-slate-800'
          }`}
        >
          <div>
            <div className="font-medium">{paused ? 'Paused' : 'Active'}</div>
            <div className="text-[11px] opacity-70">
              {paused ? 'All rules off; states kept' : 'Enabled profiles apply'}
            </div>
          </div>
          <Toggle title="Global pause" checked={paused} onChange={(v) => store.setGlobalPause(v)} />
        </div>

        {/* Profile 列表 */}
        <div className="mt-3 space-y-1">
          {config.profiles.length === 0 && (
            <p className="px-1 py-3 text-center text-slate-500 dark:text-slate-400">
              No profiles yet.
            </p>
          )}
          {config.profiles.map((profile) => (
            <div
              key={profile.id}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                paused || !profile.enabled ? 'opacity-55' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{profile.name || 'Untitled'}</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {summarize(profile)}
                </div>
              </div>
              <Toggle
                title={`Enable ${profile.name}`}
                checked={profile.enabled}
                onChange={(v) => store.updateProfile({ ...profile, enabled: v }, { flush: true })}
              />
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          Edit profiles…
        </Button>
      </div>
    </main>
  );
}
