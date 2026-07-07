import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'ButterHeader',
    description: 'Profile-based request/response header modification',
    // badge 需要 action key（暂无 popup）
    action: {},
    permissions: ['declarativeNetRequest', 'storage'],
    host_permissions: ['<all_urls>'],
  },
});
