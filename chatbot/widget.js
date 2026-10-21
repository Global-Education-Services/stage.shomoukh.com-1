import './chatbot.css';
import knowledge from './knowledge.json';
import { createChatEngine } from './engine.js';
import { isApprovedExternalSource } from './source-policy.js';

const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

export function createWidget(launcher) {
  const engine = createChatEngine(knowledge);
  const knownPages = new Set((knowledge.pages || []).map(page => {
    try { return new URL(page.url, location.origin).pathname; } catch { return ''; }
  }));
  const panel = node('section', 'school-chat');
  panel.id = 'school-chat-window';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'school-chat-title');
  launcher.setAttribute('aria-controls', panel.id);
  const header = node('div', 'school-chat-header');
  const heading = node('div');
  const title = node('h2', '', 'Shomoukh assistant');
  title.id = 'school-chat-title';
  heading.append(title, node('p', '', 'Answers from Shomoukh & official GES sources'));
  const actions = node('div', 'school-chat-actions');
  const reset = node('button', '', '↻');
  reset.type = 'button';
  reset.setAttribute('aria-label', 'Reset conversation');
  reset.title = 'Reset conversation';
  const close = node('button', '', '−');
  close.type = 'button';
  close.setAttribute('aria-label', 'Minimize chat');
  close.title = 'Minimize chat';
  actions.append(reset, close);
  header.append(heading, actions);
  const messages = node('div', 'school-chat-messages');
  messages.setAttribute('role', 'log');
  messages.setAttribute('aria-label', 'Conversation');
  messages.setAttribute('aria-live', 'polite');
  messages.setAttribute('aria-relevant', 'additions');
  messages.tabIndex = 0;
  const suggestions = node('div', 'school-chat-suggestions');
  suggestions.setAttribute('aria-label', 'Suggested questions');
  const form = node('form', 'school-chat-form');
  const label = node('label', 'school-chat-visually-hidden', 'Ask about Shomoukh');
  label.htmlFor = 'school-chat-input';
  const input = node('input');
  input.id = label.htmlFor;
  input.type = 'text';
  input.maxLength = 600;
  input.autocomplete = 'off';
  input.placeholder = 'Ask about Shomoukh…';
  input.dir = 'auto';
  const submit = node('button', '', 'Send');
  submit.type = 'submit';
  form.append(label, input, submit);
  const note = node('p', 'school-chat-note', 'English website sources · Local search · Chat stays in this page’s memory');
  panel.append(header, messages, suggestions, form, note);
  document.body.append(panel);
  let generation = 0;
  let pending = false;

  function appendMessage(text, role, sources = [], query = null) {
    const message = node('article', `school-chat-message school-chat-${role}`);
    message.setAttribute('aria-label', role === 'user' ? 'You' : 'Shomoukh assistant');
    const body = node('p', '', text);
    body.dir = 'auto';
    if(query?.corrections?.length) {
      const interpretation=node('p','school-chat-interpretation',`Understood as: ${query.interpreted}`);
      interpretation.dir='auto';
      message.append(interpretation);
    }
    message.append(body);
    const links = node('div', 'school-chat-sources');
    for (const source of sources) {
      try {
        const url = new URL(source.url, location.origin);
        const external = isApprovedExternalSource(source.url, knowledge);
        if (!external && (url.origin !== location.origin || !knownPages.has(url.pathname))) continue;
        const link = node('a', '', source.title || 'View website source');
        link.href = external ? source.url : url.pathname + url.hash;
        if (external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent += ' · GES official website (new tab)'; }
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
    const typing = appendMessage('Searching website information…', 'assistant');
    typing.classList.add('school-chat-typing');
    // Give assistive technology and the browser time to display the pending state.
    await new Promise(resolve => setTimeout(resolve, 180));
    if (generation !== currentGeneration) return;
    try {
      const result = engine.respond(text);
      typing.remove();
      appendMessage(result.text, 'assistant', result.sources, result.query);
      setPending(false);
      setSuggestions(result.suggestions);
    } catch {
      typing.remove();
      appendMessage('I could not search the website information. Please try again or use the website navigation.', 'assistant');
      setPending(false);
    }
    if (!panel.hidden) input.focus({ preventScroll: true });
  }

  function initializeConversation() {
    generation += 1;
    engine.reset();
    messages.replaceChildren();
    setPending(false);
    appendMessage('Hello! I can help you explore Shomoukh using information from this website and official GES sources. What would you like to know?', 'assistant');
    setSuggestions(engine.getSuggestions());
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
