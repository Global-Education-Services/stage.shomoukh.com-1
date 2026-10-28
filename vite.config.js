import { existsSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Serve pages at clean URLs locally, the way Cloudflare's asset handling does in
// production: /about serves about.html and /about.html redirects to /about.
function cleanUrls() {
  const middleware = root => (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const [path, query = ''] = req.url.split('?');
    const search = query ? `?${query}` : '';
    const page = path.match(/^\/([a-z0-9-]+)\.html$/i);
    if (page && page[1] !== '404') {
      res.statusCode = 308;
      res.setHeader('Location', (page[1] === 'index' ? '/' : `/${page[1]}`) + search);
      return res.end();
    }
    const clean = path.match(/^\/([a-z0-9-]+)\/?$/i);
    if (clean && existsSync(resolve(root(), `${clean[1]}.html`))) req.url = `/${clean[1]}.html${search}`;
    next();
  };
  return {
    name: 'clean-urls',
    configureServer(server) { server.middlewares.use(middleware(() => server.config.root)); },
    configurePreviewServer(server) { server.middlewares.use(middleware(() => server.config.build.outDir)); },
  };
}

export default defineConfig({
  plugins: [cleanUrls()],
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
