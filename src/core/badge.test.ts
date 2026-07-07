import { describe, expect, it } from 'vitest';
import { deriveBadge } from './badge';
import type { Config, Profile } from './compile';

const profile = (id: string, enabled: boolean): Profile => ({
  id,
  name: id,
  enabled,
  domains: [],
  rules: [],
});

describe('deriveBadge', () => {
  it('shows the count of enabled profiles, ignoring paused ones', () => {
    const config: Config = {
      globalPause: false,
      profiles: [profile('a', true), profile('b', false), profile('c', true)],
    };

    expect(deriveBadge(config)).toEqual({ text: '2', color: '#1a73e8' });
  });

  it('shows a gray pause state when globally paused, regardless of enabled profiles', () => {
    const config: Config = {
      globalPause: true,
      profiles: [profile('a', true), profile('b', true)],
    };

    expect(deriveBadge(config)).toEqual({ text: '⏸', color: '#9e9e9e' });
  });
});
