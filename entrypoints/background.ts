import { deriveBadge } from '@/src/core/badge';
import { chromeSyncStorage } from '@/src/core/chrome-storage';
import { compileRules } from '@/src/core/compile';
import type { Config } from '@/src/core/compile';
import { createConfigStore } from '@/src/core/config-store';

async function syncDnrRules(config: Config) {
  const newRules = compileRules(config);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: newRules,
  });
  const badge = deriveBadge(config);
  await chrome.action.setBadgeText({ text: badge.text });
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

export default defineBackground(() => {
  void createConfigStore(chromeSyncStorage).then((store) => {
    void syncDnrRules(store.getState().config);
    store.subscribe(() => void syncDnrRules(store.getState().config));
  });
});
