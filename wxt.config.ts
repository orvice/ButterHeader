import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'ButterHeader',
    description: 'Profile-based request/response header modification',
    permissions: ['declarativeNetRequest', 'storage'],
    host_permissions: ['<all_urls>'],
  },
});
