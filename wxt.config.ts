import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'RequestLoom — Headers & Redirects',
    description: 'Manage request and response headers and domain redirects with switchable profiles.',
    permissions: ['declarativeNetRequest', 'storage'],
    host_permissions: ['<all_urls>'],
  },
});
