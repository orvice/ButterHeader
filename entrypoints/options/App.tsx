import { useEffect, useState } from 'react';
import type { HeaderRule, Profile } from '@/src/core/compile';
import { loadConfig, saveProfile } from '@/src/core/storage';

const DEFAULT_PROFILE_ID = 'default';

function emptyProfile(): Profile {
  return { id: DEFAULT_PROFILE_ID, name: 'Default', enabled: true, domains: [], rules: [] };
}

export function App() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void loadConfig().then((config) => {
      setProfile(config.profiles.find((p) => p.id === DEFAULT_PROFILE_ID) ?? emptyProfile());
    });
  }, []);

  if (!profile) return null;

  const update = (next: Profile) => {
    setProfile(next);
    void saveProfile(next);
  };

  const updateRule = (id: string, patch: Partial<HeaderRule>) => {
    update({
      ...profile,
      rules: profile.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const addRule = () => {
    update({
      ...profile,
      rules: [
        ...profile.rules,
        {
          id: crypto.randomUUID(),
          enabled: true,
          target: 'request',
          operation: 'set',
          name: '',
          value: '',
        },
      ],
    });
  };

  return (
    <main style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'system-ui' }}>
      <h1>ButterHeader</h1>
      <h2>{profile.name}</h2>
      {profile.rules.map((rule) => (
        <div key={rule.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="Header name"
            value={rule.name}
            onChange={(e) => updateRule(rule.id, { name: e.target.value })}
          />
          <input
            placeholder="Value"
            value={rule.value ?? ''}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
          />
          <button
            onClick={() =>
              update({ ...profile, rules: profile.rules.filter((r) => r.id !== rule.id) })
            }
          >
            Delete
          </button>
        </div>
      ))}
      <button onClick={addRule}>Add header rule</button>
    </main>
  );
}
