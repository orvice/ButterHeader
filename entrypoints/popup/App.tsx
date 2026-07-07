import { useConfigStore } from '@/src/ui/use-config-store';

/** Popup 只承载高频开关，不做编辑（见 CONTEXT.md）；编辑一律在 Options 页 */
export function App() {
  const bound = useConfigStore();
  if (!bound) return null;
  const { store, state } = bound;
  const { config } = state;

  return (
    <main style={{ minWidth: 260, padding: 12, fontFamily: 'system-ui', fontSize: 14 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={config.globalPause}
          onChange={(e) => store.setGlobalPause(e.target.checked)}
        />
        <strong>Global pause</strong>
      </label>
      {config.profiles.length === 0 && <p style={{ color: '#666' }}>No profiles yet.</p>}
      {config.profiles.map((profile) => (
        <label
          key={profile.id}
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 6,
            opacity: config.globalPause ? 0.5 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={profile.enabled}
            onChange={(e) => store.updateProfile({ ...profile, enabled: e.target.checked }, { flush: true })}
          />
          {profile.name}
        </label>
      ))}
      <button style={{ marginTop: 8 }} onClick={() => void chrome.runtime.openOptionsPage()}>
        Edit profiles…
      </button>
    </main>
  );
}
