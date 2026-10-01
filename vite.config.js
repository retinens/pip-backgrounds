import { defineConfig } from 'vite';

// The build must also work when dist/index.html is opened straight from disk
// (file://, e.g. offline in the control room): browsers block module scripts and
// crossorigin requests there, so emit a classic deferred script with relative paths.
const fileProtocolFriendly = {
  name: 'file-protocol-friendly',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => html.replace(/ type="module"/g, ' defer').replace(/ crossorigin/g, ''),
  },
};

export default defineConfig({
  // BASE_PATH can force an absolute base; relative works for Pages and file:// alike
  base: process.env.BASE_PATH || './',
  plugins: [fileProtocolFriendly],
  build: {
    // three.js alone is ~600 kB; a single chunk is fine for this app
    chunkSizeWarningLimit: 1000,
    rolldownOptions: { output: { format: 'iife' } },
  },
});
