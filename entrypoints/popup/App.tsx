import { Button, Toggle } from '@/src/ui/components';
import { useConfigStore } from '@/src/ui/use-config-store';

/** Popup 只承载高频开关，不做编辑（见 CONTEXT.md）；编辑一律在 Options 页 */
export function App() {
  const bound = useConfigStore();
  if (!bound) return null;
  const { store, state } = bound;
  const { config } = state;

  return (
    <main className="w-72 p-3 text-sm text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between rounded-card bg-slate-100 px-3 py-2 dark:bg-slate-800">
        <span className="font-semibold">Global pause</span>
        <Toggle
          title="Global pause"
          checked={config.globalPause}
          onChange={(v) => store.setGlobalPause(v)}
        />
      </div>

      <div className="mt-3 space-y-1">
        {config.profiles.length === 0 && (
          <p className="px-1 py-2 text-slate-500 dark:text-slate-400">No profiles yet.</p>
        )}
        {config.profiles.map((profile) => (
          <div
            key={profile.id}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 ${
              config.globalPause ? 'opacity-50' : ''
            }`}
          >
            <span className="truncate">{profile.name}</span>
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
    </main>
  );
}
