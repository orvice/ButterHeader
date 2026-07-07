import { useState, type FormEvent } from 'react';
import type { HeaderRule, Profile } from '@/src/core/compile';
import { exportConfig, exportProfile } from '@/src/core/transfer';
import { useConfigStore } from '@/src/ui/use-config-store';

function newProfile(name: string): Profile {
  return { id: crypto.randomUUID(), name, enabled: true, domains: [], rules: [] };
}

function downloadJson(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const bound = useConfigStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!bound) return null;
  const { store, state } = bound;
  const { profiles } = state.config;

  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0] ?? null;

  const addProfile = () => {
    const profile = newProfile(`Profile ${profiles.length + 1}`);
    store.addProfile(profile);
    setSelectedId(profile.id);
  };

  const removeProfile = (profile: Profile) => {
    if (!window.confirm(`Delete profile "${profile.name}"?`)) return;
    store.removeProfile(profile.id);
    if (selectedId === profile.id) setSelectedId(null);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = profiles.map((p) => p.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    store.reorder(ids);
  };

  const updateRule = (profile: Profile, id: string, patch: Partial<HeaderRule>) => {
    store.updateProfile({
      ...profile,
      rules: profile.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>ButterHeader</h1>

      {(state.saveError || importError) && (
        <div
          role="alert"
          style={{
            background: '#fdecea',
            color: '#b3261e',
            border: '1px solid #b3261e',
            borderRadius: 4,
            padding: 8,
            marginBottom: 16,
          }}
        >
          {state.saveError
            ? `Failed to save profile "${state.saveError.profileName}": ${state.saveError.message}. ` +
              'Your edits are still on screen — trim the profile (fewer/shorter rules or domains) and edit again to retry.'
            : importError}
          {importError && (
            <button style={{ marginLeft: 8 }} onClick={() => setImportError(null)}>
              Dismiss
            </button>
          )}
        </div>
      )}

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={state.config.globalPause}
          onChange={(e) => store.setGlobalPause(e.target.checked)}
        />
        Global pause (stop all header modifications; profile states are kept)
      </label>

      <section style={{ marginBottom: 24 }}>
        <h3>Profiles</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          Drag to reorder. On same-header conflicts, profiles lower in the list win.
        </p>
        {profiles.map((profile) => (
          <div
            key={profile.id}
            draggable
            onDragStart={() => setDragId(profile.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropOn(profile.id)}
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 4,
              alignItems: 'center',
              padding: 4,
              border: '1px solid #ddd',
              borderRadius: 4,
              background: profile.id === selected?.id ? '#eef' : '#fff',
              cursor: 'grab',
            }}
          >
            <span title="Drag to reorder">⠿</span>
            <input
              type="checkbox"
              title="Enable profile"
              checked={profile.enabled}
              onChange={(e) =>
                store.updateProfile({ ...profile, enabled: e.target.checked }, { flush: true })
              }
            />
            <input
              value={profile.name}
              onChange={(e) => store.updateProfile({ ...profile, name: e.target.value })}
            />
            <button onClick={() => setSelectedId(profile.id)}>Edit</button>
            <button
              onClick={() =>
                downloadJson(`butterheader-profile-${profile.name}.json`, exportProfile(profile))
              }
            >
              Export
            </button>
            <button onClick={() => removeProfile(profile)}>Delete</button>
          </div>
        ))}
        <button onClick={addProfile}>Add profile</button>
        <button
          onClick={() => downloadJson('butterheader-config.json', exportConfig(state.config))}
        >
          Export all
        </button>
        <label style={{ marginLeft: 8 }}>
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            style={{ marginLeft: 4 }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                store.importProfiles(await file.text());
                setImportError(null);
              } catch (err) {
                setImportError(
                  `Import failed: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }}
          />
        </label>
      </section>

      {selected && (
        <section>
          <h2>{selected.name}</h2>
          <section style={{ marginBottom: 16 }}>
            <h3>Domains</h3>
            <p style={{ color: '#666', fontSize: 13 }}>
              Empty list applies to all sites. Use <code>*.example.com</code> for subdomains.
            </p>
            {selected.domains.map((domain) => (
              <div
                key={domain}
                style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}
              >
                <code>{domain}</code>
                <button
                  onClick={() =>
                    store.updateProfile(
                      { ...selected, domains: selected.domains.filter((d) => d !== domain) },
                      { flush: true },
                    )
                  }
                >
                  Delete
                </button>
              </div>
            ))}
            <form
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('domain') as HTMLInputElement;
                const domain = input.value.trim();
                if (domain && !selected.domains.includes(domain)) {
                  store.updateProfile(
                    { ...selected, domains: [...selected.domains, domain] },
                    { flush: true },
                  );
                }
                input.value = '';
              }}
            >
              <input name="domain" placeholder="example.com or *.example.com" />
              <button type="submit">Add domain</button>
            </form>
          </section>

          <h3>Header rules</h3>
          {selected.rules.map((rule) => (
            <div
              key={rule.id}
              style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}
            >
              <input
                type="checkbox"
                title="Enable rule"
                checked={rule.enabled}
                onChange={(e) => updateRule(selected, rule.id, { enabled: e.target.checked })}
              />
              <select
                value={rule.target}
                onChange={(e) =>
                  updateRule(selected, rule.id, { target: e.target.value as HeaderRule['target'] })
                }
              >
                <option value="request">Request</option>
                <option value="response">Response</option>
              </select>
              <select
                value={rule.operation}
                onChange={(e) =>
                  updateRule(selected, rule.id, {
                    operation: e.target.value as HeaderRule['operation'],
                  })
                }
              >
                <option value="set">Set</option>
                <option value="remove">Remove</option>
              </select>
              <input
                placeholder="Header name"
                value={rule.name}
                onChange={(e) => updateRule(selected, rule.id, { name: e.target.value })}
              />
              {rule.operation === 'set' && (
                <input
                  placeholder="Value"
                  value={rule.value ?? ''}
                  onChange={(e) => updateRule(selected, rule.id, { value: e.target.value })}
                />
              )}
              <button
                onClick={() =>
                  store.updateProfile(
                    { ...selected, rules: selected.rules.filter((r) => r.id !== rule.id) },
                    { flush: true },
                  )
                }
              >
                Delete
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              store.updateProfile(
                {
                  ...selected,
                  rules: [
                    ...selected.rules,
                    {
                      id: crypto.randomUUID(),
                      enabled: true,
                      target: 'request',
                      operation: 'set',
                      name: '',
                      value: '',
                    },
                  ],
                },
                { flush: true },
              )
            }
          >
            Add header rule
          </button>
        </section>
      )}
    </main>
  );
}
