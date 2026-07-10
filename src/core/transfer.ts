import type { Config, Profile } from './compile';

/** 导入/导出 JSON 格式版本（见 CONTEXT.md：带 version 字段，导入一律追加合并） */
const FORMAT_VERSION = 1;

export function exportConfig(config: Config): string {
  return JSON.stringify({ version: FORMAT_VERSION, profiles: config.profiles }, null, 2);
}

export function exportProfile(profile: Profile): string {
  return JSON.stringify({ version: FORMAT_VERSION, profile }, null, 2);
}

/** 追加合并：导入的 Profile 换上全新 id，永不与现有 Profile 冲突或覆盖 */
function asNewProfile(p: Profile): Profile {
  return {
    ...p,
    id: crypto.randomUUID(),
    rules: p.rules.map((r) => ({ ...r, id: crypto.randomUUID() })),
    ...(p.redirects
      ? { redirects: p.redirects.map((r) => ({ ...r, id: crypto.randomUUID() })) }
      : {}),
  };
}

/**
 * 解析导入 JSON，返回待追加的 Profile 列表。
 * 支持单 Profile 与全量配置两种导出格式；非法输入抛出带原因的 Error。
 */
export function parseImport(json: string): Profile[] {
  const data = JSON.parse(json);
  if (data?.version !== FORMAT_VERSION) {
    throw new Error(`Unsupported version: expected ${FORMAT_VERSION}, got ${data?.version}`);
  }
  const profiles: Profile[] | undefined = data.profile ? [data.profile] : data.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error('No profile found in imported JSON');
  }
  return profiles.map(asNewProfile);
}
