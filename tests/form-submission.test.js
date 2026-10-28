// Port of shomoukh.com's tests/form-submission.test.mjs for the JavaScript Worker.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {submitForm} from '../worker/form-submission.js';
import worker from '../worker/index.js';

const env = {RESEND_API_KEY: 'test-secret', FORM_FROM_EMAIL: 'forms@example.com', FORM_IT_RECIPIENT: 'it@example.com', FORM_AL_MOUJ_RECIPIENT: 'mouj@example.com', FORM_AL_QURUM_RECIPIENT: 'qurum@example.com', FORM_ALLOWED_ORIGIN: 'https://shomoukh.com,https://www.shomoukh.com', TURNSTILE_SITE_KEY: 'site', TURNSTILE_SECRET_KEY: 'secret', FORM_RATE_LIMITER: {limit: async () => ({success: true})}};
const payload = {type: 'Contact enquiry', campus: 'Al Mouj', website: '', turnstileToken: 'token', entries: [{section: 'Contact', label: 'Name', value: '<script>alert(1)</script>'}]};
function request(body = payload, headers = {}) { return new Request('https://shomoukh.com/api/form-submission', {method: 'POST', headers: {'content-type': 'application/json', origin: 'https://shomoukh.com', 'cf-connecting-ip': '192.0.2.1', ...headers}, body: JSON.stringify(body)}); }
function provider({hostname = 'shomoukh.com', action = 'form_submission', success = true, status = 200} = {}) {
  const calls = [];
  return {calls, send: async (url, options) => { calls.push({url, options}); return url.includes('siteverify') ? Response.json({success, hostname, action}) : Response.json(status === 200 ? {id: 'email-test'} : {message: 'private-provider-details'}, {status}); }};
}
// Keep expected failure logs out of the test output.
console.error = () => {};
console.info = () => {};

test('both allowed hosts work, recipients are fixed, HTML is escaped, secrets stay out of response', async () => {
  for (const host of ['shomoukh.com', 'www.shomoukh.com']) {
    const p = provider({hostname: host});
    const r = await submitForm(request(payload, {origin: 'https://' + host}), env, true, p.send);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    const email = JSON.parse(p.calls[1].options.body);
    assert.equal(p.calls[1].url, 'https://api.resend.com/emails');
    assert.equal(p.calls[1].options.headers.Authorization, 'Bearer test-secret');
    assert.deepEqual(email.to, ['mouj@example.com', 'it@example.com']);
    assert.equal(email.subject, 'Contact enquiry — Al Mouj');
    assert.ok(email.html.includes('&lt;script&gt;'));
    assert.ok(!email.html.includes('<script>'));
    assert.ok(!(await r.text()).includes('test-secret'));
  }
});
test('Al Qurum submissions go to the Al Qurum inbox', async () => {
  const p = provider();
  assert.equal((await submitForm(request({...payload, campus: 'Al Qurum'}), env, true, p.send)).status, 200);
  assert.deepEqual(JSON.parse(p.calls[1].options.body).to, ['qurum@example.com', 'it@example.com']);
});
test('email groups section headers once and formats ISO dates to DD-MM-YYYY', async () => {
  const p = provider();
  const tourPayload = {
    type: 'Book a Visit', campus: 'Al Mouj', website: '', turnstileToken: 'token',
    entries: [
      {section: 'BOOK A VISIT', label: 'Please enter your name', value: 'Jane Doe'},
      {section: 'BOOK A VISIT', label: "Your child's date of birth", value: '2026-09-01'},
      {section: 'BOOK A VISIT', label: 'When would you like to visit?', value: '2026-09-11'},
      {section: 'OTHER', label: 'Note', value: 'Hello'},
    ],
  };
  const r = await submitForm(request(tourPayload), env, true, p.send);
  assert.equal(r.status, 200);
  const email = JSON.parse(p.calls[1].options.body);
  assert.equal(email.html.match(/<h2>BOOK A VISIT<\/h2>/g).length, 1);
  assert.ok(email.html.includes('01-09-2026'));
  assert.ok(email.html.includes('11-09-2026'));
});
test('cross-origin and absent origin requests never reach provider', async () => {
  for (const origin of ['https://evil.test', 'null', '']) {
    const p = provider();
    assert.equal((await submitForm(request(payload, {origin}), env, true, p.send)).status, 403);
    assert.equal(p.calls.length, 0);
  }
});
test('malformed and oversized bodies are rejected without email', async () => {
  for (const value of [null, [], {...payload, entries: [null]}, {...payload, entries: Array(251).fill(payload.entries[0])}, {...payload, campus: 'constructor'}, {...payload, website: 'spam'}]) {
    const p = provider();
    assert.equal((await submitForm(request(value), env, true, p.send)).status, 400);
    assert.equal(p.calls.length, 0);
  }
  const p = provider();
  assert.equal((await submitForm(request({...payload, padding: 'x'.repeat(140000)}), env, true, p.send)).status, 413);
  assert.equal(p.calls.length, 0);
  const r = request();
  const bad = new Request(r.url, {method: 'POST', headers: r.headers, body: '{bad'});
  assert.equal((await submitForm(bad, env, true, p.send)).status, 400);
});
test('Turnstile rejects failed, expired, wrong-host and wrong-action checks', async () => {
  for (const opts of [{success: false}, {hostname: 'evil.test'}, {action: 'other'}]) {
    const p = provider(opts);
    assert.equal((await submitForm(request(), env, true, p.send)).status, 400);
    assert.equal(p.calls.length, 1);
  }
});
test('missing production security fails closed; rate limiter uses CF IP', async () => {
  const p = provider();
  for (const name of ['RESEND_API_KEY', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_SITE_KEY', 'FORM_RATE_LIMITER']) assert.equal((await submitForm(request(), {...env, [name]: undefined}, true, p.send)).status, 503);
  let key;
  const r = await submitForm(request(payload, {'x-forwarded-for': 'fake'}), {...env, FORM_RATE_LIMITER: {limit: async input => { key = input.key; return {success: false}; }}}, true, p.send);
  assert.equal(key, '192.0.2.1');
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('retry-after'), '60');
  assert.equal(p.calls.length, 0);
});
test('Resend errors stay private and retry uses stable idempotency key', async () => {
  const a = provider({status: 429});
  const b = provider();
  const r = await submitForm(request(), env, true, a.send);
  assert.equal(r.status, 503);
  assert.ok(!(await r.text()).includes('private-provider-details'));
  await submitForm(request(), env, true, b.send);
  assert.equal(a.calls[1].options.headers['Idempotency-Key'], b.calls[1].options.headers['Idempotency-Key']);
});
test('network errors, unsupported media and method handled safely', async () => {
  assert.equal((await submitForm(request(), env, true, async () => { throw new Error('secret'); })).status, 503);
  assert.equal((await submitForm(request(payload, {'content-type': 'text/plain'}), env)).status, 415);
  assert.equal((await submitForm(new Request('https://shomoukh.com/api/form-submission'), env)).status, 405);
});
test('Worker enforces HTTPS, serves form config and applies security headers to pages and API errors', async () => {
  const workerEnv = {...env, ASSETS: {fetch: async () => new Response('page')}};
  const redirect = await worker.fetch(new Request('http://shomoukh.com/about'), workerEnv);
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://shomoukh.com/about');
  const denied = await worker.fetch(new Request('http://shomoukh.com/api/form-submission', {method: 'POST'}), workerEnv);
  assert.equal(denied.status, 403);
  assert.deepEqual(await (await worker.fetch(new Request('https://shomoukh.com/api/form-config'), workerEnv)).json(), {siteKey: 'site'});
  assert.equal((await worker.fetch(new Request('https://shomoukh.com/api/form-config', {method: 'POST'}), workerEnv)).status, 405);
  for (const path of ['/about', '/assets/logo.png', '/api/form-config', '/api/form-submission']) {
    const r = await worker.fetch(new Request('https://shomoukh.com' + path), workerEnv);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
    assert.ok(r.headers.get('content-security-policy').includes('https://fonts.gstatic.com'));
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  }
});
