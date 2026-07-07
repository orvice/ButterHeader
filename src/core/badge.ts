import type { Config } from './compile';

export interface Badge {
  text: string;
  color: string;
}

export function deriveBadge(config: Config): Badge {
  if (config.globalPause) return { text: '⏸', color: '#9e9e9e' };
  const count = config.profiles.filter((p) => p.enabled).length;
  return { text: String(count), color: '#1a73e8' };
}
