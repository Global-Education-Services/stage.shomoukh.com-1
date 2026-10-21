import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about.html'),
        programs: resolve(import.meta.dirname, 'programs.html'),
        enrichments: resolve(import.meta.dirname, 'enrichments.html'),
        spaces: resolve(import.meta.dirname, 'spaces.html'),
        admissions: resolve(import.meta.dirname, 'admissions.html'),
        'book-a-visit': resolve(import.meta.dirname, 'book-a-visit.html'),
        'apply-online': resolve(import.meta.dirname, 'apply-online.html'),
        parents: resolve(import.meta.dirname, 'parents.html'),
        contact: resolve(import.meta.dirname, 'contact.html'),
        '404': resolve(import.meta.dirname, '404.html'),
      },
    },
  },
});
