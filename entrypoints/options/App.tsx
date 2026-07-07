import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { HeaderRule, Profile } from '@/src/core/compile';
import {
  deleteProfile,
  loadConfig,
  saveProfile,
  setGlobalPause,
  setProfileOrder,
} from '@/src/core/storage';
import { createProfileSaver } from '@/src/core/save-queue';
import { exportConfig, exportProfile, parseImport } from '@/src/core/transfer';

function downloadJson(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function newProfile(name: string): Profile {
  return { id: crypto.randomUUID(), name, enabled: true, domains: [], rules: [] };
}

export function App() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [globalPause, setGlobalPauseState] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saver = useMemo(
    () =>
      createProfileSaver({
        save: saveProfile,
        delayMs: 500,
        onError: (error, unsaved) =>
          setSaveError(
            `Failed to save profile "${unsaved.name}": ${
              error instanceof Error ? error.message : String(error)
            }. Your edits are still on screen — trim the profile (fewer/shorter rules or domains) and edit again to retry.`,
          ),
      }),
    [],
  );

  useEffect(() => {
    void loadConfig().then((config) => {
      setProfiles(config.profiles);
      setGlobalPauseState(config.globalPause);
      setSelectedId(config.profiles[0]?.id ?? null);
    });
  }, []);

  if (!profiles) return null;

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  const updateProfile = (next: Profile) => {
    setProfiles(profiles.map((p) => (p.id === next.id ? next : p)));
    setSaveError(null);
    saver.enqueue(next);
  };

  const addProfile = () => {
    const profile = newProfile(`Profile ${profiles.length + 1}`);
    setProfiles([...profiles, profile]);
    setSelectedId(profile.id);
    void saveProfile(profile);
  };

  const removeProfile = (profile: Profile) => {
    if (!window.confirm(`Delete profile "${profile.name}"?`)) return;
    const next = profiles.filter((p) => p.id !== profile.id);
    setProfiles(next);
    if (selectedId === profile.id) setSelectedId(next[0]?.id ?? null);
    void deleteProfile(profile.id);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = profiles.filter((p) => p.id !== dragId);
    const dragged = profiles.find((p) => p.id === dragId)!;
    next.splice(next.findIndex((p) => p.id === targetId), 0, dragged);
    setProfiles(next);
    void setProfileOrder(next.map((p) => p.id));
  };

  const updateRule = (profile: Profile, id: string, patch: Partial<HeaderRule>) => {
    updateProfile({
      ...profile,
      rules: profile.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>ButterHeader</h1>

      {saveError && (
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
          {saveError}
          <button style={{ marginLeft: 8 }} onClick={() => setSaveError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={globalPause}
          onChange={(e) => {
            setGlobalPauseState(e.target.checked);
            void setGlobalPause(e.target.checked);
          }}
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
              background: profile.id === selectedId ? '#eef' : '#fff',
              cursor: 'grab',
            }}
          >
            <span title="Drag to reorder">⠿</span>
            <input
              type="checkbox"
              title="Enable profile"
              checked={profile.enabled}
              onChange={(e) => updateProfile({ ...profile, enabled: e.target.checked })}
            />
            <input
              value={profile.name}
              onChange={(e) => updateProfile({ ...profile, name: e.target.value })}
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
          onClick={() => downloadJson('butterheader-config.json', exportConfig({ globalPause, profiles }))}
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
                const imported = parseImport(await file.text());
                for (const p of imported) await saveProfile(p);
                setProfiles([...profiles, ...imported]);
              } catch (err) {
                window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
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
                    updateProfile({
                      ...selected,
                      domains: selected.domains.filter((d) => d !== domain),
                    })
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
                  updateProfile({ ...selected, domains: [...selected.domains, domain] });
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
                  updateProfile({
                    ...selected,
                    rules: selected.rules.filter((r) => r.id !== rule.id),
                  })
                }
              >
                Delete
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              updateProfile({
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
              })
            }
          >
            Add header rule
          </button>
        </section>
      )}
    </main>
  );
}
