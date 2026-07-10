import { useState, type FormEvent } from 'react';
import type { HeaderRule, Profile, RedirectRule } from '@/src/core/compile';
import { exportConfig, exportProfile } from '@/src/core/transfer';
import { Button, Select, TextInput, Toggle, card } from '@/src/ui/components';
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

const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
const hint = 'text-[13px] text-slate-500 dark:text-slate-400';

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

  const updateRedirect = (
    profile: Profile,
    id: string,
    patch: Partial<RedirectRule>,
    opts?: { flush?: boolean },
  ) => {
    store.updateProfile(
      {
        ...profile,
        redirects: (profile.redirects ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
      opts,
    );
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
        <h1 className="text-xl font-bold tracking-tight">Butter Box</h1>
      </header>

      {(state.saveError || importError) && (
        <div
          role="alert"
          className="mx-6 mt-4 flex items-start gap-2 rounded-card border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          <span aria-hidden className="mt-0.5">⚠️</span>
          <div className="flex-1">
            {state.saveError
              ? `Failed to save profile "${state.saveError.profileName}": ${state.saveError.message}. ` +
                'Your edits are still on screen — trim the profile (fewer/shorter rules or domains) and edit again to retry.'
              : importError}
          </div>
          {importError && (
            <Button variant="ghost" className="px-2 py-0.5" onClick={() => setImportError(null)}>
              Dismiss
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start gap-6 px-6 py-6">
        {/* 侧边栏：全局暂停 + Profile 选择/排序 + 增删导入导出 */}
        <aside className="w-60 shrink-0 space-y-3">
          <div className={`flex items-center justify-between ${card} px-3 py-2`}>
            <div>
              <div className="text-sm font-medium">Global pause</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Profile states kept</div>
            </div>
            <Toggle
              title="Global pause"
              checked={state.config.globalPause}
              onChange={(v) => store.setGlobalPause(v)}
            />
          </div>

          <div>
            <h2 className={`mb-1.5 ${sectionTitle}`}>Profiles</h2>
            <div className="space-y-1">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  draggable
                  onDragStart={() => setDragId(profile.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(profile.id)}
                  onClick={() => setSelectedId(profile.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    profile.id === selected?.id
                      ? 'bg-accent/10 ring-1 ring-accent'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="cursor-grab select-none text-slate-400"
                    title="Drag to reorder"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⠿
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      title="Enable profile"
                      checked={profile.enabled}
                      onChange={(v) =>
                        store.updateProfile({ ...profile, enabled: v }, { flush: true })
                      }
                    />
                  </span>
                  <span className={`flex-1 truncate ${profile.enabled ? '' : 'text-slate-400'}`}>
                    {profile.name || 'Untitled'}
                  </span>
                </div>
              ))}
              {profiles.length === 0 && (
                <p className={`px-1 py-1 ${hint}`}>No profiles yet.</p>
              )}
            </div>
            <p className={`mt-1.5 text-[11px] text-slate-400`}>Drag to reorder; lower wins conflicts.</p>
          </div>

          <Button variant="primary" className="w-full" onClick={addProfile}>
            + Add profile
          </Button>

          <div className="flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
            <Button
              className="flex-1"
              onClick={() => downloadJson('butter-box-config.json', exportConfig(state.config))}
            >
              Export all
            </Button>
            <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              Import
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  try {
                    store.importProfiles(await file.text());
                    setImportError(null);
                  } catch (err) {
                    setImportError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
                  }
                }}
              />
            </label>
          </div>
        </aside>

        {/* 编辑区：选中 Profile 的重命名/导出/删除 + Domains / Header / Redirect */}
        <div className="min-w-0 flex-1">
          {selected ? (
            <section className={`${card} p-5`}>
              <div className="mb-5 flex items-center gap-2">
                <TextInput
                  className="flex-1 text-lg font-semibold"
                  aria-label="Profile name"
                  value={selected.name}
                  onChange={(e) => store.updateProfile({ ...selected, name: e.target.value })}
                />
                <Button
                  onClick={() =>
                    downloadJson(`butter-box-profile-${selected.name}.json`, exportProfile(selected))
                  }
                >
                  Export
                </Button>
                <Button variant="danger" onClick={() => removeProfile(selected)}>
                  Delete
                </Button>
              </div>

              <div className="mb-6">
                <h3 className={`mb-1 ${sectionTitle}`}>Domains</h3>
                <p className={`mb-3 ${hint}`}>
                  Empty list applies to all sites. Use <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">*.example.com</code> for subdomains.
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {selected.domains.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm dark:bg-slate-700"
                    >
                      <code>{domain}</code>
                      <button
                        title={`Remove ${domain}`}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:bg-slate-300 hover:text-slate-800 dark:hover:bg-slate-600 dark:hover:text-slate-100"
                        onClick={() =>
                          store.updateProfile(
                            { ...selected, domains: selected.domains.filter((d) => d !== domain) },
                            { flush: true },
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  className="flex gap-2"
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
                  <TextInput name="domain" className="flex-1" placeholder="example.com or *.example.com" />
                  <Button variant="secondary" type="submit">
                    Add domain
                  </Button>
                </form>
              </div>

              <h3 className={`mb-2 ${sectionTitle}`}>Header rules</h3>
              <div className="space-y-2">
                {selected.rules.map((rule) => (
                  <div key={rule.id} className="flex flex-wrap items-center gap-2">
                    <Toggle
                      title="Enable rule"
                      checked={rule.enabled}
                      onChange={(v) => updateRule(selected, rule.id, { enabled: v })}
                    />
                    <Select
                      value={rule.target}
                      onChange={(e) =>
                        updateRule(selected, rule.id, { target: e.target.value as HeaderRule['target'] })
                      }
                    >
                      <option value="request">Request</option>
                      <option value="response">Response</option>
                    </Select>
                    <Select
                      value={rule.operation}
                      onChange={(e) =>
                        updateRule(selected, rule.id, {
                          operation: e.target.value as HeaderRule['operation'],
                        })
                      }
                    >
                      <option value="set">Set</option>
                      <option value="remove">Remove</option>
                    </Select>
                    <TextInput
                      className="flex-1"
                      placeholder="Header name"
                      value={rule.name}
                      onChange={(e) => updateRule(selected, rule.id, { name: e.target.value })}
                    />
                    {rule.operation === 'set' && (
                      <TextInput
                        className="flex-1"
                        placeholder="Value"
                        value={rule.value ?? ''}
                        onChange={(e) => updateRule(selected, rule.id, { value: e.target.value })}
                      />
                    )}
                    <Button
                      variant="danger"
                      onClick={() =>
                        store.updateProfile(
                          { ...selected, rules: selected.rules.filter((r) => r.id !== rule.id) },
                          { flush: true },
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                className="mt-3"
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
                + Add header rule
              </Button>

              <h3 className={`mb-1 mt-6 ${sectionTitle}`}>Redirect rules</h3>
              <p className={`mb-2 ${hint}`}>
                Redirect requests to a matched source domain to another host (path and query are
                kept). Target: <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">host</code>,{' '}
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">host:port</code>, or{' '}
                <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">http://localhost:3000</code>.
              </p>
              <div className="space-y-2">
                {(selected.redirects ?? []).map((redirect) => (
                  <div key={redirect.id} className="flex flex-wrap items-center gap-2">
                    <Toggle
                      title="Enable redirect"
                      checked={redirect.enabled}
                      onChange={(v) => updateRedirect(selected, redirect.id, { enabled: v }, { flush: true })}
                    />
                    <TextInput
                      className="flex-1"
                      placeholder="Source: example.com or *.example.com"
                      value={redirect.source}
                      onChange={(e) => updateRedirect(selected, redirect.id, { source: e.target.value })}
                    />
                    <span aria-hidden className="text-slate-400">→</span>
                    <TextInput
                      className="flex-1"
                      placeholder="Target: localhost:3000"
                      value={redirect.target}
                      onChange={(e) => updateRedirect(selected, redirect.id, { target: e.target.value })}
                    />
                    <Button
                      variant="danger"
                      onClick={() =>
                        store.updateProfile(
                          {
                            ...selected,
                            redirects: (selected.redirects ?? []).filter((r) => r.id !== redirect.id),
                          },
                          { flush: true },
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() =>
                  store.updateProfile(
                    {
                      ...selected,
                      redirects: [
                        ...(selected.redirects ?? []),
                        { id: crypto.randomUUID(), enabled: true, source: '', target: '' },
                      ],
                    },
                    { flush: true },
                  )
                }
              >
                + Add redirect
              </Button>
            </section>
          ) : (
            <div className={`${card} p-10 text-center ${hint}`}>
              Select a profile on the left, or add one to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
