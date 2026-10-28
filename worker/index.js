import {json, submitForm} from './form-submission.js';
import {securityHeaders} from './security-headers.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    let response;
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      url.protocol = 'https:';
      response = ['GET', 'HEAD'].includes(request.method) ? Response.redirect(url, 308) : json({error: 'HTTPS is required.'}, 403);
    } else if (path === '/api/form-submission') {
      // The shomoukh-com Worker holds the Resend and Turnstile secrets. Until this Worker
      // has its own, hand submissions to it unchanged so its form handler sends the email.
      response = !env.RESEND_API_KEY && env.SHOMOUKH_FORMS ? await env.SHOMOUKH_FORMS.fetch(request) : await submitForm(request, env);
    } else if (path === '/api/form-config') {
      response = request.method === 'GET' ? json({siteKey: env.TURNSTILE_SITE_KEY || null}) : json({error: 'Method not allowed.'}, 405, {Allow: 'GET'});
    } else {
      // Static pages; the assets config serves 404.html for unknown paths.
      response = await env.ASSETS.fetch(request);
    }
    const secured = new Response([204, 205, 304].includes(response.status) ? null : response.body, response);
    for (const [key, value] of Object.entries(securityHeaders)) secured.headers.set(key, value);
    secured.headers.delete('X-Powered-By');
    return secured;
  },
};
