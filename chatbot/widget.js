import './chatbot.css';
import knowledge from './knowledge.json';
import { createChatEngine } from './engine.js';
import { isApprovedExternalSource } from './source-policy.js';
import { publicPath } from '../site/public-path.js';
import { alternatePath, isArabic } from '../site/i18n.js';
import { searchWebsite as searchArabic } from '../site/search-ar.js';

const ui = isArabic ? {
  title: 'مساعد شموخ', reset: 'بدء محادثة جديدة', minimize: 'تصغير المحادثة', conversation: 'المحادثة', suggested: 'أسئلة مقترحة',
  label: 'اسأل عن شموخ', placeholder: 'اسأل عن شموخ…', send: 'إرسال', you: 'أنت', understood: 'فهمتُ سؤالك على أنه: ', source: 'عرض المصدر في الموقع',
  external: ' · موقع GES الرسمي (نافذة جديدة)', searching: 'جارٍ البحث في معلومات الموقع…',
  failed: 'تعذّر البحث في معلومات الموقع. يُرجى المحاولة مرة أخرى أو استخدام قائمة الموقع.',
  welcome: 'مرحبًا! يمكنني مساعدتك في التعرّف على شموخ من خلال معلومات هذا الموقع. اكتب سؤالك بالعربية أو الإنجليزية.',
} : {
  title: 'Shomoukh assistant', reset: 'Reset conversation', minimize: 'Minimize chat', conversation: 'Conversation', suggested: 'Suggested questions',
  label: 'Ask about Shomoukh', placeholder: 'Ask about Shomoukh…', send: 'Send', you: 'You', understood: 'Understood as: ', source: 'View website source',
  external: ' · GES official website (new tab)', searching: 'Searching website information…',
  failed: 'I could not search the website information. Please try again or use the website navigation.',
  welcome: 'Hello! I can help you explore Shomoukh using information from this website and official GES sources. What would you like to know?',
};
const ARABIC_SUGGESTIONS = ['ما الأعمار التي تقبلونها؟', 'كيف أحجز زيارة؟', 'ما هي المستندات المطلوبة للتسجيل؟', 'أين تقع الفروع؟', 'ما هي ساعات الدوام؟', 'ما هي المشاغل؟'];
// Arabic questions are answered from the Arabic pages; the English knowledge base answers the rest.
function respondInArabic(text) {
  // Same answer as the English engine: the website publishes no fee amounts.
  if (/رسوم(?!ات)|[اأ]سعار|سعر(?!ات)|تكلف|تكاليف|مصاريف/.test(text)) {
    return {text: 'لم أجد مبالغ رسوم موثّقة في محتوى الموقع العام. يُرجى التواصل مع الحضانة للتأكد.', sources: [{url: '/ar/contact', title: 'اتصل بنا'}], suggestions: ARABIC_SUGGESTIONS.slice(0, 3)};
  }
  // The opening hours on the contact page read "الأحد – الخميس: 7:00 صباحًا" with no word a visitor would search for.
  if (/ساعات|الدوام|دوام|أوقات|اوقات|متى تفتح|متى تغلق|متى يفتح|متى يغلق/.test(text)) {
    return {text: 'ساعات الدوام في فرعَي الموج والقرم: الأحد – الخميس، 7:00 صباحًا – 4:00 عصرًا.', sources: [{url: '/ar/contact', title: 'اتصل بنا'}], suggestions: ARABIC_SUGGESTIONS.filter(question => question !== text).slice(0, 3)};
  }
  const matches = searchArabic(text, 3);
  if (!matches.length) {
    return {text: 'لم أجد إجابة لهذا السؤال في الموقع. جرّب صياغة أخرى، أو تواصل مع الفرع مباشرةً عبر صفحة «اتصل بنا».', sources: [{url: '/ar/contact', title: 'اتصل بنا'}], suggestions: ARABIC_SUGGESTIONS.slice(0, 3)};
  }
  const [best] = matches;
  return {
    text: `${best.title}: ${best.excerpt}`,
    sources: matches.map(match => ({url: match.url, title: match.title})),
    suggestions: ARABIC_SUGGESTIONS.filter(question => question !== text).sort(() => Math.random() - 0.5).slice(0, 3),
  };
}
const hasArabic = text => /[\u0600-\u06FF]/.test(text);

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

export function createWidget(launcher) {
  const engine = createChatEngine(knowledge);
  const knownPages = new Set((knowledge.pages || []).flatMap(page => {
    try {
      const path = publicPath(new URL(page.url, location.origin).pathname);
      return [path, alternatePath('ar', {pathname: path, search: '', hash: ''})];
    } catch { return []; }
  }));
  const panel = node('section', 'school-chat');
  panel.id = 'school-chat-window';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'school-chat-title');
  launcher.setAttribute('aria-controls', panel.id);
  const header = node('div', 'school-chat-header');
  const heading = node('div');
  const title = node('h2', '', ui.title);
  title.id = 'school-chat-title';
  heading.append(title, node('p', '', ''));
  const actions = node('div', 'school-chat-actions');
  const reset = node('button', '', '↻');
  reset.type = 'button';
  reset.setAttribute('aria-label', ui.reset);
  reset.title = ui.reset;
  const close = node('button', '', '−');
  close.type = 'button';
  close.setAttribute('aria-label', ui.minimize);
  close.title = ui.minimize;
  actions.append(reset, close);
  header.append(heading, actions);
  const messages = node('div', 'school-chat-messages');
  messages.setAttribute('role', 'log');
  messages.setAttribute('aria-label', ui.conversation);
  messages.setAttribute('aria-live', 'polite');
  messages.setAttribute('aria-relevant', 'additions');
  messages.tabIndex = 0;
  const suggestions = node('div', 'school-chat-suggestions');
  suggestions.setAttribute('aria-label', ui.suggested);
  const form = node('form', 'school-chat-form');
  const label = node('label', 'school-chat-visually-hidden', ui.label);
  label.htmlFor = 'school-chat-input';
  const input = node('input');
  input.id = label.htmlFor;
  input.type = 'text';
  input.maxLength = 600;
  input.autocomplete = 'off';
  input.placeholder = ui.placeholder;
  input.dir = 'auto';
  const submit = node('button', '', ui.send);
  submit.type = 'submit';
  form.append(label, input, submit);
  const note = node('p', 'school-chat-note', '');
  panel.append(header, messages, suggestions, form, note);
  document.body.append(panel);
  let generation = 0;
  let pending = false;

  function appendMessage(text, role, sources = [], query = null) {
    const message = node('article', `school-chat-message school-chat-${role}`);
    message.setAttribute('aria-label', role === 'user' ? ui.you : ui.title);
    const body = node('p', '', text);
    body.dir = 'auto';
    if (query?.corrections?.length) {
      const interpretation = node('p', 'school-chat-interpretation', `${ui.understood}${query.interpreted}`);
      interpretation.dir = 'auto';
      message.append(interpretation);
    }
    message.append(body);
    const links = node('div', 'school-chat-sources');
    for (const source of sources) {
      try {
        const url = new URL(source.url, location.origin);
        const external = isApprovedExternalSource(source.url, knowledge);
        const path = publicPath(url.pathname);
        if (!external && (url.origin !== location.origin || !knownPages.has(path))) continue;
        const link = node('a', '', source.title || ui.source);
        // On Arabic pages, English answers still link to the Arabic version of their source page.
        link.href = external ? source.url : isArabic ? alternatePath('ar', {pathname: path, search: '', hash: url.hash}) : path + url.hash;
        if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent += ui.external; }
        links.append(link);
      } catch { /* Ignore invalid or unapproved source URLs. */ }
    }
    if (links.childElementCount) message.append(links);
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function setSuggestions(questions) {
    suggestions.replaceChildren();
    for (const question of (questions || []).slice(0, 3)) {
      const button = node('button', '', question);
      button.type = 'button';
      button.disabled = pending;
      button.addEventListener('click', () => send(question));
      suggestions.append(button);
    }
  }

  function setPending(value) {
    pending = value;
    submit.disabled = value;
    for (const button of suggestions.querySelectorAll('button')) button.disabled = value;
  }

  async function send(raw) {
    const text = raw.trim().slice(0, 600);
    if (!text || pending) return;
    const currentGeneration = generation;
    appendMessage(text, 'user');
    input.value = '';
    setPending(true);
    const typing = appendMessage(ui.searching, 'assistant');
    typing.classList.add('school-chat-typing');
    // Give assistive technology and the browser time to display the pending state.
    await new Promise(resolve => setTimeout(resolve, 180));
    if (generation !== currentGeneration) return;
    try {
      const result = hasArabic(text) ? respondInArabic(text) : engine.respond(text);
      typing.remove();
      appendMessage(result.text, 'assistant', result.sources, result.query);
      setPending(false);
      setSuggestions(result.suggestions);
    } catch {
      typing.remove();
      appendMessage(ui.failed, 'assistant');
      setPending(false);
    }
    if (!panel.hidden) input.focus({ preventScroll: true });
  }

  function initializeConversation() {
    generation += 1;
    engine.reset();
    messages.replaceChildren();
    setPending(false);
    appendMessage(ui.welcome, 'assistant');
    setSuggestions(isArabic ? ARABIC_SUGGESTIONS.slice(0, 3) : engine.getSuggestions());
  }

  function minimize() {
    panel.hidden = true;
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus({ preventScroll: true });
  }
  close.addEventListener('click', minimize);
  reset.addEventListener('click', () => { initializeConversation(); input.focus(); });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      minimize();
    }
  });
  form.addEventListener('submit', event => { event.preventDefault(); send(input.value); });
  initializeConversation();
  return {
    open() {
      panel.hidden = false;
      launcher.hidden = true;
      launcher.setAttribute('aria-expanded', 'true');
      input.focus({ preventScroll: true });
    },
  };
}
