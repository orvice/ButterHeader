export interface HeaderRule {
  id: string;
  enabled: boolean;
  target: 'request' | 'response';
  operation: 'set' | 'remove';
  name: string;
  value?: string;
}

export interface Profile {
  id: string;
  name: string;
  enabled: boolean;
  /** Domain Filter：空列表 = 对所有网站生效（见 CONTEXT.md） */
  domains: string[];
  rules: HeaderRule[];
}

export interface Config {
  globalPause: boolean;
  /** 数组顺序即冲突覆盖顺序：后者覆盖前者 */
  profiles: Profile[];
}

type DNRRule = chrome.declarativeNetRequest.Rule;

const ALL_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other',
] as chrome.declarativeNetRequest.ResourceType[];

function toHeaderInfo(rule: HeaderRule): chrome.declarativeNetRequest.ModifyHeaderInfo {
  const operation = rule.operation as chrome.declarativeNetRequest.HeaderOperation;
  return rule.operation === 'set'
    ? { header: rule.name, operation, value: rule.value }
    : { header: rule.name, operation };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Domain Filter → DNR condition（见 CONTEXT.md）。用 regexFilter 而非
 * requestDomains：requestDomains 天然连带子域，无法表达「example.com 不命中子域」。
 */
function toDomainCondition(domains: string[]): chrome.declarativeNetRequest.RuleCondition {
  if (domains.length === 0) return { urlFilter: '*' };
  const hostAlts = domains.map((d) =>
    d.startsWith('*.') ? `[^/:]+\\.${escapeRegex(d.slice(2))}` : escapeRegex(d),
  );
  return { regexFilter: `^[^:]+://(?:${hostAlts.join('|')})(?::\\d+)?(?:/|$)` };
}

export function compileRules(config: Config): DNRRule[] {
  const rules: DNRRule[] = [];
  // 全局暂停只叠加判定，不改写 Profile/规则状态（见 CONTEXT.md）
  if (config.globalPause) return rules;
  for (const [index, profile] of config.profiles.entries()) {
    if (!profile.enabled) continue;
    for (const rule of profile.rules) {
      if (!rule.enabled) continue;
      rules.push({
        id: rules.length + 1,
        // 冲突覆盖（Override by Order）：列表靠后的 Profile priority 更高，
        // DNR 对同名 header 先应用高优先级规则，set 后低优先级不再修改
        priority: index + 1,
        action: {
          type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
          ...(rule.target === 'request'
            ? { requestHeaders: [toHeaderInfo(rule)] }
            : { responseHeaders: [toHeaderInfo(rule)] }),
        },
        condition: {
          ...toDomainCondition(profile.domains),
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    }
  }
  return rules;
}
