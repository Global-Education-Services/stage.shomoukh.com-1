// Deliberate exact-page allowlist. Neither visitor input nor an arbitrary knowledge
// record can authorize a new external host, protocol, redirect, or query string.
export const APPROVED_EXTERNAL_URLS = new Set([
  'https://www.ges.om/',
  'https://www.ges.om/about.php',
  'https://www.ges.om/index.php',
]);
export function isApprovedExternalSource(url, knowledge) {
  return APPROVED_EXTERNAL_URLS.has(url) &&
    (knowledge.externalSources || []).some(source => source.url === url);
}
