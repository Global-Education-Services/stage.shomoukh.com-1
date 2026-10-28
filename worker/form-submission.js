// Port of shomoukh.com's lib/form-submission.ts: validates a form submission, verifies
// Cloudflare Turnstile and delivers it to the campus inbox through the Resend API.
const TYPES = new Set(['Enrolment application', 'Book a Visit', 'Contact enquiry']);
const MAX_BYTES = 128 * 1024;
export const escapeHtml = text => text.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[c]));
const record = v => !!v && typeof v === 'object' && !Array.isArray(v);

export function json(data, status = 200, headers = {}) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});
}

class InputError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new InputError(413, 'Submission is too large.');
  if (!request.body) throw new InputError(400, 'Invalid submission.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new InputError(413, 'Submission is too large.'); }
      text += decoder.decode(value, {stream: true});
    }
    text += decoder.decode();
    try { return JSON.parse(text); } catch { throw new InputError(400, 'Invalid JSON.'); }
  } finally { reader.releaseLock(); }
}

export async function submitForm(request, env, production = true, send = fetch) {
  const requestId = crypto.randomUUID();
  const fail = (error, status, headers = {}) => json({error, requestId}, status, headers);
  const log = (event, details = {}) => console.error(JSON.stringify({event, requestId, ...details}));
  try {
    if (request.method !== 'POST') return fail('Method not allowed.', 405, {Allow: 'POST'});
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail('Unsupported request type.', 415);
    const origins = (env.FORM_ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    if ((production || origins.length) && (!origins.includes(request.headers.get('origin') || '') || request.headers.get('sec-fetch-site') === 'cross-site')) return fail('Invalid request origin.', 403);
    // Cloudflare sets this header at its edge. Never trust user-supplied X-Forwarded-For.
    const ip = request.headers.get('cf-connecting-ip');
    if (production && (!env.FORM_RATE_LIMITER || !ip)) { log('form_security_configuration_missing'); return fail('Submissions are temporarily unavailable. Please contact the campus.', 503); }
    if (env.FORM_RATE_LIMITER && ip && !(await env.FORM_RATE_LIMITER.limit({key: ip})).success) return fail('Too many submissions. Please wait a minute and try again.', 429, {'Retry-After': '60'});
    const body = await readBody(request);
    if (!record(body) || typeof body.type !== 'string' || !TYPES.has(body.type) || typeof body.campus !== 'string' || !['Al Mouj', 'Al Qurum'].includes(body.campus) || (body.website !== undefined && body.website !== '') || !Array.isArray(body.entries) || !body.entries.length || body.entries.length > 250) return fail('Invalid submission.', 400);
    if (body.entries.some(e => !record(e) || typeof e.section !== 'string' || typeof e.label !== 'string' || typeof e.value !== 'string' || !e.label.trim() || !e.value.trim() || e.section.length > 200 || e.label.length > 500 || e.value.length > 5000)) return fail('Invalid submission fields.', 400);
    const entries = body.entries;
    const recipient = body.campus === 'Al Mouj' ? env.FORM_AL_MOUJ_RECIPIENT : env.FORM_AL_QURUM_RECIPIENT;
    if (!env.RESEND_API_KEY || !recipient || !env.FORM_IT_RECIPIENT || !env.FORM_FROM_EMAIL || (production && (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY))) {
      log('form_configuration_missing'); return fail('Submissions are temporarily unavailable. Please contact the campus.', 503);
    }
    if (env.TURNSTILE_SECRET_KEY) {
      if (typeof body.turnstileToken !== 'string' || !body.turnstileToken || body.turnstileToken.length > 2048) return fail('Please complete the security check.', 400);
      const verification = await send('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken, ...(ip ? {remoteip: ip} : {})}),
      });
      if (!verification.ok) { log('turnstile_unavailable', {status: verification.status}); return fail('Security check is temporarily unavailable. Please try again.', 503); }
      const check = await verification.json();
      const hostname = new URL(request.headers.get('origin') || request.url).hostname;
      if (!record(check) || check.success !== true || check.hostname !== hostname || check.action !== 'form_submission') return fail('Security check expired or failed. Please try again.', 400);
    }
    const formatValue = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('-') : value;
    const sections = new Map();
    for (const entry of entries) {
      const section = entry.section.trim();
      const list = sections.get(section) || [];
      list.push(entry);
      sections.set(section, list);
    }
    const htmlSections = [...sections.entries()].map(([section, items]) =>
      (section ? `<h2>${escapeHtml(section)}</h2>` : '') +
      items.map(e => `<p><strong>${escapeHtml(e.label)}</strong><br>${escapeHtml(formatValue(e.value)).replace(/\n/g, '<br>')}</p>`).join('')
    ).join('');

    // The payload digest makes retries idempotent without retaining children's information.
    const email = JSON.stringify({
      from: env.FORM_FROM_EMAIL,
      to: [...new Set([recipient, env.FORM_IT_RECIPIENT])],
      subject: `${body.type} — ${body.campus}`,
      html: `<h1>New ${escapeHtml(body.type)}</h1><p>Campus: ${escapeHtml(body.campus)}</p>${htmlSections}`,
    });
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
    const idempotencyKey = 'form-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    const response = await send('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: {Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey}, body: email,
    });
    if (!response.ok) {
      // Never log provider response bodies, keys, names, addresses or form contents.
      log('resend_rejected', {status: response.status});
      await response.body?.cancel();
      return fail('We could not deliver your submission. Please try again later or contact the campus.', 503, {'Retry-After': '60'});
    }
    const result = await response.json();
    if (!record(result) || typeof result.id !== 'string' || !result.id) { log('resend_invalid_response'); return fail('Unable to confirm delivery. Please try again.', 502); }
    console.info(JSON.stringify({event: 'form_accepted', requestId, providerId: result.id}));
    return json({ok: true, requestId});
  } catch (error) {
    if (error instanceof InputError) return fail(error.message, error.status);
    log('form_dependency_failure', {kind: error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'unavailable'});
    return fail('Unable to deliver submission. Please try again later or contact the campus.', 503);
  }
}
