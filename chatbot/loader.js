// Only this small launcher is included in the initial website bundle.
export function installChatbot() {
  if (document.getElementById('school-chat-launcher')) return;
  const launcher = document.createElement('button');
  launcher.id = 'school-chat-launcher';
  launcher.type = 'button';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('width', '26');
  icon.setAttribute('height', '26');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  const bubble = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  bubble.setAttribute('d', 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z');
  const lines = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  lines.setAttribute('d', 'M8 9h8M8 13h5');
  icon.append(bubble, lines);
  launcher.append(icon);
  launcher.setAttribute('aria-label', 'Open Shomoukh website assistant');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.setAttribute('aria-expanded', 'false');
  Object.assign(launcher.style, {
    position: 'fixed', right: 'max(16px, env(safe-area-inset-right))',
    bottom: 'calc(88px + env(safe-area-inset-bottom))', zIndex: '1001',
    background: 'var(--shomoukh-primary, #1c3a47)', color: '#fff',
    border: '2px solid #e3d1ba', borderRadius: '50%', padding: '13px', width: '56px', height: '56px', display: 'grid', placeItems: 'center',
    font: '600 15px var(--font-body, sans-serif)', minHeight: '48px',
    cursor: 'pointer', boxShadow: '0 8px 30px #1c3a4726',
  });
  document.body.append(launcher);
  let widget;
  let loading = false;
  launcher.addEventListener('click', async () => {
    if (loading) return;
    if (widget) { widget.open(); return; }
    loading = true;
    launcher.setAttribute('aria-busy', 'true');
    launcher.setAttribute('aria-label', 'Opening website assistant');
    try {
      const { createWidget } = await import('./widget.js');
      widget = createWidget(launcher);
      launcher.setAttribute('aria-label', 'Open Shomoukh website assistant');
      widget.open();
    } catch {
      launcher.setAttribute('aria-label', 'Chat could not load. Retry website assistant');
    } finally {
      loading = false;
      launcher.removeAttribute('aria-busy');
    }
  });
}
