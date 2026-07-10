import { describe, expect, it } from 'vitest';
import type { Config, Profile } from './compile';
import { exportConfig, exportProfile, parseImport } from './transfer';

const profile = (id: string, name: string): Profile => ({
  id,
  name,
  enabled: true,
  domains: ['example.com'],
  rules: [
    { id: `${id}-r1`, enabled: true, target: 'request', operation: 'set', name: 'X-A', value: '1' },
  ],
});

describe('exportConfig', () => {
  it('exports the full config as JSON with a version field and all profiles in order', () => {
    const config: Config = {
      globalPause: false,
      profiles: [profile('p1', 'First'), profile('p2', 'Second')],
    };

    const parsed = JSON.parse(exportConfig(config));
    expect(parsed.version).toBe(1);
    expect(parsed.profiles.map((p: Profile) => p.name)).toEqual(['First', 'Second']);
    expect(parsed.profiles[0].rules[0]).toEqual({
      id: 'p1-r1',
      enabled: true,
      target: 'request',
      operation: 'set',
      name: 'X-A',
      value: '1',
    });
  });
});

describe('exportProfile', () => {
  it('exports a single profile as JSON with a version field', () => {
    const parsed = JSON.parse(exportProfile(profile('p1', 'Solo')));
    expect(parsed.version).toBe(1);
    expect(parsed.profile.name).toBe('Solo');
    expect(parsed.profile.domains).toEqual(['example.com']);
  });
});

describe('parseImport', () => {
  it('parses a single-profile export into one profile to append, with a fresh id so existing profiles are untouched', () => {
    const original = profile('p1', 'Solo');

    const imported = parseImport(exportProfile(original));

    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe('Solo');
    expect(imported[0].domains).toEqual(['example.com']);
    expect(imported[0].rules).toHaveLength(1);
    expect(imported[0].id).not.toBe('p1');
  });

  it('regenerates redirect-rule ids on import so appended profiles never collide', () => {
    const original: Profile = {
      ...profile('p1', 'Solo'),
      redirects: [{ id: 'rd1', enabled: true, source: 'a.com', target: 'localhost:3000' }],
    };

    const [imported] = parseImport(exportProfile(original));

    expect(imported.redirects).toHaveLength(1);
    expect(imported.redirects![0].id).not.toBe('rd1');
    expect(imported.redirects![0].source).toBe('a.com');
    expect(imported.redirects![0].target).toBe('localhost:3000');
  });

  it('parses a full-config export into all profiles in order, each with a fresh id', () => {
    const config: Config = {
      globalPause: true,
      profiles: [profile('p1', 'First'), profile('p2', 'Second')],
    };

    const imported = parseImport(exportConfig(config));

    expect(imported.map((p) => p.name)).toEqual(['First', 'Second']);
    expect(imported.map((p) => p.id)).not.toContain('p1');
    expect(imported.map((p) => p.id)).not.toContain('p2');
  });

  it('rejects malformed JSON, unknown versions, and shapeless payloads with clear errors', () => {
    expect(() => parseImport('not json {')).toThrow();
    expect(() => parseImport('{"version":2,"profiles":[]}')).toThrow(/version/i);
    expect(() => parseImport('{"version":1}')).toThrow(/profile/i);
    expect(() => parseImport('{"profiles":[]}')).toThrow(/version/i);
  });
});
