import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        programs: resolve(__dirname, 'programs.html'),
        enrichments: resolve(__dirname, 'enrichments.html'),
        spaces: resolve(__dirname, 'spaces.html'),
        admissions: resolve(__dirname, 'admissions.html'),
        'book-a-visit': resolve(__dirname, 'book-a-visit.html'),
        'apply-online': resolve(__dirname, 'apply-online.html'),
        parents: resolve(__dirname, 'parents.html'),
        contact: resolve(__dirname, 'contact.html'),
        '404': resolve(__dirname, '404.html'),
      },
    },
  },
});
