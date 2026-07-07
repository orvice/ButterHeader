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

export function compileRules(config: Config): DNRRule[] {
  const rules: DNRRule[] = [];
  for (const profile of config.profiles) {
    if (!profile.enabled) continue;
    for (const rule of profile.rules) {
      if (!rule.enabled) continue;
      rules.push({
        id: rules.length + 1,
        priority: 1,
        action: {
          type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
          ...(rule.target === 'request'
            ? { requestHeaders: [toHeaderInfo(rule)] }
            : { responseHeaders: [toHeaderInfo(rule)] }),
        },
        condition: {
          urlFilter: '*',
          resourceTypes: ALL_RESOURCE_TYPES,
        },
      });
    }
  }
  return rules;
}
