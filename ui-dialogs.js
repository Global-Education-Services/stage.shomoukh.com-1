// Shared dialog focus, keyboard containment and background isolation.
export function createDialogController() {
  let activeDialog = null;
  let triggerElement = null;
  let previousBodyOverflow = '';
  const backgroundInertMap = new Map();

  const getFocusable = (container) => [
    ...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ].filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible');

  document.querySelectorAll('[role="dialog"]').forEach(dialog => {
    dialog.setAttribute('aria-modal', 'true');
    dialog.inert = dialog.getAttribute('aria-hidden') === 'true';
    if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
      const heading = dialog.querySelector('h2[id], h3[id]');
      heading ? dialog.setAttribute('aria-labelledby', heading.id) : dialog.setAttribute('aria-label', 'Site navigation');
    }
  });

  function close(target = activeDialog) {
    if (!target) return;
    activeDialog = null;
    target.classList.remove('open');
    target.setAttribute('aria-hidden', 'true');
    target.inert = true;

    backgroundInertMap.forEach((prevInert, el) => {
      el.inert = prevInert;
    });
    backgroundInertMap.clear();

    document.body.style.overflow = previousBodyOverflow || '';
    if (triggerElement?.isConnected) {
      triggerElement.focus({ preventScroll: true });
    }

    document.querySelectorAll('[aria-controls]').forEach(control => {
      if (control.getAttribute('aria-controls') === target.id) {
        control.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function open(target, initialFocus) {
    if (!target) return;
    if (activeDialog && activeDialog !== target) {
      close(activeDialog);
    }
    triggerElement = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    activeDialog = target;

    target.inert = false;
    target.setAttribute('aria-hidden', 'false');
    target.classList.add('open');

    // Make siblings inert for accessibility focus containment
    for (let el = target; el.parentElement && el !== document.body; el = el.parentElement) {
      for (const sibling of el.parentElement.children) {
        if (sibling !== el && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
          backgroundInertMap.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
    }

    document.body.style.overflow = 'hidden';
    target.tabIndex = -1;
    const focusTarget = initialFocus || getFocusable(target)[0] || target;
    focusTarget.focus({ preventScroll: true });
  }

  document.addEventListener('keydown', (e) => {
    if (!activeDialog) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close(activeDialog);
      return;
    }
    if (e.key === 'Tab') {
      const focusable = getFocusable(activeDialog);
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === activeDialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('focusin', (e) => {
    if (activeDialog && !activeDialog.contains(e.target)) {
      const focusable = getFocusable(activeDialog);
      (focusable[0] || activeDialog).focus();
    }
  });

  return { open, close };
}
