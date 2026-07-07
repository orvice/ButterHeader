import { useEffect, useState, type FormEvent } from 'react';
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
      <section style={{ marginBottom: 16 }}>
        <h3>Domains</h3>
        <p style={{ color: '#666', fontSize: 13 }}>
          Empty list applies to all sites. Use <code>*.example.com</code> for subdomains.
        </p>
        {profile.domains.map((domain) => (
          <div key={domain} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
            <code>{domain}</code>
            <button
              onClick={() =>
                update({ ...profile, domains: profile.domains.filter((d) => d !== domain) })
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
            if (domain && !profile.domains.includes(domain)) {
              update({ ...profile, domains: [...profile.domains, domain] });
            }
            input.value = '';
          }}
        >
          <input name="domain" placeholder="example.com or *.example.com" />
          <button type="submit">Add domain</button>
        </form>
      </section>
      {profile.rules.map((rule) => (
        <div key={rule.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            title="Enable rule"
            checked={rule.enabled}
            onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
          />
          <select
            value={rule.target}
            onChange={(e) => updateRule(rule.id, { target: e.target.value as HeaderRule['target'] })}
          >
            <option value="request">Request</option>
            <option value="response">Response</option>
          </select>
          <select
            value={rule.operation}
            onChange={(e) =>
              updateRule(rule.id, { operation: e.target.value as HeaderRule['operation'] })
            }
          >
            <option value="set">Set</option>
            <option value="remove">Remove</option>
          </select>
          <input
            placeholder="Header name"
            value={rule.name}
            onChange={(e) => updateRule(rule.id, { name: e.target.value })}
          />
          {rule.operation === 'set' && (
            <input
              placeholder="Value"
              value={rule.value ?? ''}
              onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            />
          )}
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
