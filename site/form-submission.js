// Client side of the shomoukh.com forms: Turnstile security check, entry building and
// delivery through the Worker's /api/form-submission endpoint (which sends via Resend).

const SECURITY_ERROR = 'Security check could not load. Please refresh the page or contact the campus.';
let scriptPromise;

function loadTurnstile() {
  return scriptPromise ||= new Promise((resolve, reject) => {
    if (window.turnstile) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); scriptPromise = undefined; reject(new Error('Security check unavailable')); };
    document.head.appendChild(script);
  });
}

// Mirrors the reference FormSecurity component: each call (initially and after a failed
// attempt) clears the token and renders a fresh widget.
function createSecurity(form, onToken) {
  const container = form.querySelector('[data-turnstile]');
  const error = form.querySelector('.form-security-error');
  let widget;
  let run = 0;
  const showError = visible => { if (error) error.hidden = !visible; };
  return async function start() {
    const current = ++run;
    if (widget && window.turnstile) window.turnstile.remove(widget);
    widget = undefined;
    onToken('');
    showError(false);
    try {
      const response = await fetch('/api/form-config', {cache: 'no-store'});
      const config = await response.json();
      if (!response.ok || !config.siteKey) throw new Error('Unavailable');
      await loadTurnstile();
      if (current !== run || !container || !window.turnstile) return;
      widget = window.turnstile.render(container, {
        sitekey: config.siteKey, action: 'form_submission',
        callback: token => { onToken(token); showError(false); },
        'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); showError(true); },
      });
    } catch {
      if (current === run) showError(true);
    }
  };
}

function simpleEntries(form, section) {
  return Array.from(new FormData(form).entries())
    .filter(([label]) => !['website', 'cf-turnstile-response'].includes(label))
    .map(([label, value]) => ({section, label, value: String(value)}));
}

function enrolmentEntries(form) {
  const headers = Array.from(form.querySelectorAll('.form-section-header'));
  const fields = Array.from(form.querySelectorAll('input, select, textarea'));
  const preferredDays = fields.filter(field => field.name === 'preferred_days' && field.checked).map(field => field.value);
  if (preferredDays.length === 0) throw new Error('Please select at least one preferred attendance day.');
  return [
    ...fields.flatMap(field => {
      if (['preferred_days', 'website', 'cf-turnstile-response'].includes(field.name)) return [];
      const isCheckable = field instanceof HTMLInputElement && (field.type === 'radio' || field.type === 'checkbox');
      if (isCheckable && !field.checked) return [];
      const value = field.value.trim() || (isCheckable && field.type === 'checkbox' && field.checked ? 'Yes' : '');
      if (!value) return [];
      const group = field.closest('.form-group, .yes-no-group, .health-item, .acknowledgement-group');
      const label = group?.querySelector('.form-label')?.innerText.replace(/\*/g, '').trim() || field.name || 'Response';
      const section = headers.findLast(header => Boolean(header.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING))?.innerText.trim() || 'APPLICATION DETAILS';
      return [{section, label, value}];
    }),
    {
      section: 'ADDITIONAL INFORMATION',
      label: 'Select your preferred days of attendance: days must be consecutive. (The chosen days will be confirmed by the admission team in the final step of enrollment)',
      value: preferredDays.join(', '),
    },
  ];
}

function successScreen(type) {
  const enrolment = type === 'Enrolment application';
  const screen = document.createElement('div');
  screen.className = enrolment ? 'submission-success enrolment-success' : 'submission-success form-success-screen';
  screen.setAttribute('role', 'status');
  const heading = document.createElement(enrolment ? 'h3' : 'h2');
  heading.textContent = enrolment ? 'Thank you for applying.' : type === 'Book a Visit' ? 'Thank you for booking a visit.' : 'Thank you for contacting us.';
  const message = document.createElement('p');
  message.textContent = enrolment ? 'Thank you for enrolling. Our admissions team will be in touch.' : 'Our team will be in touch.';
  screen.innerHTML = '<div class="submission-success__mark" aria-hidden="true">✓</div><p class="submission-success__eyebrow">SHOMOUKH NURSERY SCHOOL</p>';
  screen.append(heading, message);
  return screen;
}

export function installForms(root = document) {
  for (const form of root.querySelectorAll('form[data-form-type]')) {
    const type = form.dataset.formType;
    const enrolment = type === 'Enrolment application';
    const button = form.querySelector('button[type="submit"], button:not([type])');
    const label = button?.textContent || '';
    const error = form.querySelector('.form-error');
    let token = '';
    let sending = false;
    const sync = () => { if (button) { button.disabled = sending || !token; button.textContent = sending ? 'Sending…' : label; } };
    const showError = message => { if (error) { error.textContent = message; error.hidden = !message; } };
    const security = createSecurity(form, value => { token = value; sync(); });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || !token) return;
      let entries;
      try {
        entries = enrolment ? enrolmentEntries(form) : simpleEntries(form, type === 'Book a Visit' ? 'BOOK A VISIT' : 'CONTACT');
      } catch (problem) { showError(problem.message); return; }
      const data = new FormData(form);
      showError('');
      sending = true;
      sync();
      try {
        const response = await fetch('/api/form-submission', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({type, campus: data.get(enrolment ? 'campus' : 'Choose Shomoukh campus'), entries, website: data.get('website'), turnstileToken: token}),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || (enrolment ? 'Unable to send application' : 'Unable to submit.'));
        form.reset();
        form.replaceWith(successScreen(type));
      } catch (problem) {
        showError(problem instanceof Error && problem.message ? problem.message : 'Please try again or contact the campus directly.');
        void security();
      } finally {
        sending = false;
        sync();
      }
    });

    sync();
    void security();
  }
}
