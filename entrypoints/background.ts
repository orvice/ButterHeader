import { compileRules } from '@/src/core/compile';
import { loadConfig } from '@/src/core/storage';

async function syncDnrRules() {
  const config = await loadConfig();
  const newRules = compileRules(config);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: newRules,
  });
}

export default defineBackground(() => {
  void syncDnrRules();
  chrome.storage.sync.onChanged.addListener(() => void syncDnrRules());
});
