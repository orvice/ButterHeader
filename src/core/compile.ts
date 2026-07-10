export interface HeaderRule {
  id: string;
  enabled: boolean;
  target: 'request' | 'response';
  operation: 'set' | 'remove';
  name: string;
  value?: string;
}

export interface RedirectRule {
  id: string;
  enabled: boolean;
  /** 源域名：example.com 精确 / *.example.com 通配（复用 Domain Filter 语义） */
  source: string;
  /** 目标：host | host:port | scheme://host[:port]，如 localhost:3000、http://localhost:3000 */
  target: string;
}

export interface Profile {
  id: string;
  name: string;
  enabled: boolean;
  /** Domain Filter：空列表 = 对所有网站生效（见 CONTEXT.md） */
  domains: string[];
  rules: HeaderRule[];
  /** Redirect 规则（见 CONTEXT.md）；旧配置无此字段，视为空 */
  redirects?: RedirectRule[];
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

/**
 * 解析 redirect 目标为 DNR URLTransform 的 host/port/scheme。
 * 支持 host、host:port、scheme://host[:port]；无 host 返回 null（规则跳过）。
 */
export function parseRedirectTarget(
  target: string,
): { host: string; port?: string; scheme?: string } | null {
  let rest = target.trim();
  if (rest === '') return null;
  let scheme: string | undefined;
  const schemeMatch = rest.match(/^(https?):\/\//i);
  if (schemeMatch) {
    scheme = schemeMatch[1].toLowerCase();
    rest = rest.slice(schemeMatch[0].length);
  }
  // 去掉可能残留的 path/query（只取 authority 段）
  rest = rest.split('/')[0];
  let port: string | undefined;
  const portMatch = rest.match(/:(\d+)$/);
  if (portMatch) {
    port = portMatch[1];
    rest = rest.slice(0, portMatch.index);
  }
  if (rest === '') return null;
  return { host: rest, ...(port ? { port } : {}), ...(scheme ? { scheme } : {}) };
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
    for (const redirect of profile.redirects ?? []) {
      if (!redirect.enabled) continue;
      const transform = parseRedirectTarget(redirect.target);
      if (!transform) continue;
      rules.push({
        id: rules.length + 1,
        priority: index + 1,
        action: {
          type: 'redirect' as chrome.declarativeNetRequest.RuleActionType,
          redirect: { transform },
        },
        condition: {
          // 源域名复用 Domain Filter 语义（精确/通配），保留 path/query
          ...toDomainCondition([redirect.source]),
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    }
  }
  return rules;
}
