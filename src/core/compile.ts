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

export function compileRules(config: Config): DNRRule[] {
  const rules: DNRRule[] = [];
  for (const profile of config.profiles) {
    if (!profile.enabled) continue;
    for (const rule of profile.rules) {
      rules.push({
        id: rules.length + 1,
        priority: 1,
        action: {
          type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
          requestHeaders: [
            {
              header: rule.name,
              operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
              value: rule.value,
            },
          ],
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
