import {focusDialog, releaseDialog} from './site/dialog-focus.js';
import { installChatbot } from './chatbot/loader.js';
import {installForms} from './site/form-submission.js';

installChatbot();

// Shomoukh Nursery School Interactivity & Modal Handlers
document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     1. STICKY HEADER TRANSITION ON SCROLL
     ============================================================ */
  const header = document.getElementById('site-header');
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  window.addEventListener('scroll', () => {
    if (header) {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    if (scrollToTopBtn) {
      if (window.scrollY > 400) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    }
  }, { passive: true });

  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ============================================================
     2. OFFCANVAS NAVIGATION DRAWER
     ============================================================ */
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const menuCloseBtn = document.getElementById('menu-close-btn');
  const offcanvasDrawer = document.getElementById('offcanvas-drawer');

  function openOffcanvas() {
    if (!offcanvasDrawer) return;
    offcanvasDrawer.classList.add('open');
    offcanvasDrawer.setAttribute('aria-hidden', 'false');
    focusDialog(offcanvasDrawer, menuCloseBtn);
    if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeOffcanvas() {
    if (!offcanvasDrawer) return;
    releaseDialog(offcanvasDrawer);
    offcanvasDrawer.classList.remove('open');
    offcanvasDrawer.setAttribute('aria-hidden', 'true');
    if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (menuToggleBtn) menuToggleBtn.addEventListener('click', openOffcanvas);
  if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeOffcanvas);

  // Submenu Accordions inside Drawer
  const submenuToggles = document.querySelectorAll('.submenu-toggle-btn');
  submenuToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const parentItem = toggle.closest('.drawer-menu-item');
      const isCurrentlyActive = parentItem.classList.contains('active');

      document.querySelectorAll('.drawer-menu-item.active').forEach(item => {
        if (item !== parentItem) {
          item.classList.remove('active');
          const btn = item.querySelector('.submenu-toggle-btn');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });

      if (isCurrentlyActive) {
        parentItem.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        parentItem.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ============================================================
     3. SEARCH MODAL OVERLAY
     ============================================================ */
  const searchOpenBtn = document.getElementById('search-open-btn');
  const searchModal = document.getElementById('search-modal');
  const searchCloseBtn = document.getElementById('search-close-btn');
  const searchInput = document.getElementById('search-input');
  const searchBackdrop = document.querySelector('.search-modal-backdrop');

  function openSearch() {
    if (!searchModal) return;
    searchModal.classList.add('open');
    searchModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    focusDialog(searchModal, searchInput);
  }

  function closeSearch() {
    if (!searchModal) return;
    releaseDialog(searchModal);
    searchModal.classList.remove('open');
    searchModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener('click', openSearch);
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
  if (searchBackdrop) searchBackdrop.addEventListener('click', closeSearch);

  // Close search on quick-tag click
  document.querySelectorAll('.search-quick-tags a').forEach(tag => {
    tag.addEventListener('click', closeSearch);
  });

  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    const results = document.createElement('section');
    results.className = 'site-search-results';
    results.setAttribute('aria-label', 'Search results');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const list = document.createElement('ul');
    results.append(status, list);
    searchForm.after(results);
    let searchVersion = 0;
    searchForm.addEventListener('submit', async event => {
      event.preventDefault();
      const query = searchInput.value.trim();
      const version = ++searchVersion;
      list.replaceChildren();
      if (!query) { status.textContent = 'Enter a topic to search this website.'; searchInput.focus(); return; }
      status.textContent = 'Searching website content…';
      try {
        const {searchWebsite} = await import('./site/search.js');
        if (version !== searchVersion) return;
        const matches = searchWebsite(query);
        status.textContent = matches.length ? `${matches.length} matching pages and sections` : 'No matching content found. Try a different topic, such as admissions, campuses or tours.';
        for (const match of matches) {
          const item = document.createElement('li');
          const link = document.createElement('a');
          link.href = match.url;
          link.textContent = match.title;
          if (match.url.startsWith('https://')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(' · Official GES source'); }
          else link.addEventListener('click', closeSearch);
          const excerpt = document.createElement('p');
          excerpt.textContent = match.excerpt;
          item.append(link, excerpt); list.append(item);
        }
      } catch {
        if (version === searchVersion) status.textContent = 'Search could not load. Please use the website menu or try again.';
      }
    });
  }

  /* ============================================================
     4. VIDEO LIGHTBOX MODAL
     ============================================================ */
  const videoModal = document.getElementById('video-modal');
  const openVideoLightboxBtn = document.getElementById('open-video-lightbox-btn');
  const videoModalClose = document.getElementById('video-modal-close');
  const videoModalBackdrop = document.getElementById('video-modal-backdrop');
  const lightboxVideo = document.getElementById('lightbox-video');

  function openVideoModal() {
    if (!videoModal) return;
    videoModal.classList.add('open');
    videoModal.setAttribute('aria-hidden', 'false');
    focusDialog(videoModal, videoModalClose);
    document.body.style.overflow = 'hidden';
    if (lightboxVideo) {
      lightboxVideo.currentTime = 0;
      lightboxVideo.play().catch(e => console.log('Video play interrupted:', e));
    }
  }

  function closeVideoModal() {
    if (!videoModal) return;
    releaseDialog(videoModal);
    videoModal.classList.remove('open');
    videoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lightboxVideo) lightboxVideo.pause();
  }

  if (openVideoLightboxBtn) openVideoLightboxBtn.addEventListener('click', openVideoModal);
  if (videoModalClose) videoModalClose.addEventListener('click', closeVideoModal);
  if (videoModalBackdrop) videoModalBackdrop.addEventListener('click', closeVideoModal);

  /* ============================================================
     5. HERO BACKGROUND VIDEO CONTROL
     ============================================================ */
  const heroBgVideo = document.getElementById('hero-bg-video');
  const heroVideoToggleBtn = document.getElementById('hero-video-toggle-btn');

  if (heroBgVideo) {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heroBgVideo.src = heroBgVideo.dataset.backgroundSrc;
      heroBgVideo.play().catch(() => {});
    }

  }

  if (heroVideoToggleBtn && heroBgVideo) {
    const updateVideoControl = () => {
      const paused = heroBgVideo.paused;
      heroVideoToggleBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
      heroVideoToggleBtn.innerHTML = paused ? '<i class="fa-solid fa-play" aria-hidden="true"></i> <span>PLAY VIDEO</span>' : '<i class="fa-solid fa-pause" aria-hidden="true"></i> <span>PAUSE VIDEO</span>';
    };
    heroBgVideo.addEventListener('play', updateVideoControl);
    heroBgVideo.addEventListener('pause', updateVideoControl);
    heroVideoToggleBtn.addEventListener('click', () => {
      if (!heroBgVideo.getAttribute('src')) heroBgVideo.src = heroBgVideo.dataset.backgroundSrc;
      if (heroBgVideo.paused) heroBgVideo.play().catch(() => { updateVideoControl(); showToast('The video could not play. Please try again.'); });
      else heroBgVideo.pause();
    });
    updateVideoControl();
  }

  /* ============================================================
     6. SHOMOUKH ENRICHMENTS & ATELIERS DETAIL MODAL
     ============================================================ */
  const studentLifeData = {
    'modal-arts': {
      category: 'RESEARCH ATELIER',
      title: 'Clay Atelier',
      desc: 'Children experiment with clay, a soft and natural material with a smooth texture that can be shaped by the gestures of their hands or using various sculpting tools.',
      img: '/images/atelier-clay.jpg',
      bullets: [
        'Hands-on tactile sensory exploration with natural clay',
        'Fostering fine motor skills, hand gestures, and tool usage',
        'Expressing 3D sculptural concepts and structural thinking',
        'Guided supervision by trained Atelierista (artists)'
      ]
    },
    'modal-athletics': {
      category: 'EXPRESSION',
      title: 'Art Atelier',
      desc: 'Children have access to stimulating resources and are encouraged to use multiple symbolic languages, tools, and materials to express themselves creatively.',
      img: '/images/atelier-art.jpg',
      bullets: [
        'Rich variety of paints, pastels, natural dyes, and papers',
        'Encouraging individual symbolic expressions and storytelling',
        'Open-ended art provocations nurturing curiosity',
        'Exhibitions documenting each child\'s creative process'
      ]
    },
    'modal-gole': {
      category: 'INNOVATION',
      title: 'Digital & Light Atelier',
      desc: 'Children use light in different forms alongside analogical and digital tools to investigate new connections, learning strategies, logic, and imagination.',
      img: '/images/atelier-digital.jpg',
      bullets: [
        'Light tables, projectors, shadows, and color filters',
        'Exploration of patterns, reflection, and optical science',
        'Integrating digital technology with early childhood logic',
        'Interactive group investigations and discovery'
      ]
    },
    'modal-coed': {
      category: 'EXPLORATION',
      title: 'Project-Based Learning',
      desc: 'Following a project approach, children explore their own ideas and make meaningful connections with the world around them generated through brainstorming.',
      img: '/images/atelier-project.jpg',
      bullets: [
        'Child-led topics generated from everyday observations',
        'Deep inquiry spanning weeks of collaborative research',
        'Documentation of hypotheses, testing, and discoveries',
        'Equal partnership between children, teachers, and parents'
      ]
    },
    'modal-winterim': {
      category: 'PRETEND PLAY',
      title: 'Tiny Town',
      desc: 'A dedicated pretend play area that helps children learn about themselves, balance their own ideas with others, and foster social skills.',
      img: '/images/atelier-tinytown.jpg',
      bullets: [
        'Miniature town setup for imaginative roleplay',
        'Developing social negotiation and empathy with peers',
        'Enhancing language acquisition and narrative thinking',
        'Safe space for real-world simulation and problem-solving'
      ]
    },
    'modal-clubs': {
      category: 'DEVELOPMENT',
      title: 'Sensory Play',
      desc: 'Engaging activities that stimulate the senses, supporting brain development, problem-solving strategies, and language acquisition.',
      img: '/images/atelier-sensory.jpg',
      bullets: [
        'Water tables, sand kitchens, and organic textures',
        'Stimulating neural pathways and cognitive focus',
        'Developing descriptive vocabulary and communication',
        'Calming, therapeutic, and self-regulating experiences'
      ]
    },
    'modal-laureate': {
      category: 'HARMONY',
      title: 'Music & Movement',
      desc: 'Music activities balance the body and mind and improve children’s ability to learn. Children are exposed to music from a young age to develop all their potential.',
      img: '/images/atelier-music.jpg',
      bullets: [
        'Rhythm instruments, singing, and listening games',
        'Auditory processing and pattern recognition',
        'Gross motor coordination through rhythmic dance',
        'Nurturing confidence and musical appreciation'
      ]
    },
    'modal-advisory': {
      category: 'CONFIDENCE',
      title: 'Drama, Puppetry & ECA / PE',
      desc: 'Through roleplay and puppetry, students act out favorite stories. Extracurricular physical education and sports build skills and social bonds.',
      img: '/images/atelier-sports.jpg',
      bullets: [
        'Story dramatization and puppet theater',
        'Physical education games building balance and strength',
        'Fostering teamwork, sportsmanship, and friendships',
        'Building public speaking confidence from an early age'
      ]
    }
  };

  const detailModal = document.getElementById('detail-modal');
  const detailModalClose = document.getElementById('detail-modal-close');
  const detailModalBackdrop = document.querySelector('.detail-modal-backdrop');
  const detailModalCategory = document.getElementById('detail-modal-category');
  const detailModalTitle = document.getElementById('detail-modal-title');
  const detailModalDesc = document.getElementById('detail-modal-desc');
  const detailModalImg = document.getElementById('detail-modal-img');
  const detailModalBullets = document.getElementById('detail-modal-bullets');

  function openDetailModal(dataKey) {
    const data = studentLifeData[dataKey];
    if (!data || !detailModal) return;

    if (detailModalCategory) detailModalCategory.textContent = data.category;
    if (detailModalTitle) detailModalTitle.textContent = data.title;
    if (detailModalDesc) detailModalDesc.textContent = data.desc;
    if (detailModalImg) {
      detailModalImg.src = data.img;
      detailModalImg.alt = data.title;
    }

    if (detailModalBullets) {
      detailModalBullets.innerHTML = '';
      data.bullets.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        detailModalBullets.appendChild(li);
      });
    }

    detailModal.classList.add('open');
    detailModal.setAttribute('aria-hidden', 'false');
    focusDialog(detailModal, detailModalClose);
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    if (!detailModal) return;
    releaseDialog(detailModal);
    detailModal.classList.remove('open');
    detailModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.pursue-item-card').forEach(card => {
    const target = card.getAttribute('data-modal-target');
    card.addEventListener('click', () => openDetailModal(target));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetailModal(target);
      }
    });
  });

  if (detailModalClose) detailModalClose.addEventListener('click', closeDetailModal);
  if (detailModalBackdrop) detailModalBackdrop.addEventListener('click', closeDetailModal);

  /* ============================================================
     8. TOAST NOTIFICATION UTILITY
     ============================================================ */
  let toastFeedback = document.getElementById('toast-feedback');
  if (!toastFeedback) {
    toastFeedback = document.createElement('div');
    toastFeedback.id = 'toast-feedback'; toastFeedback.className = 'toast-feedback';
    toastFeedback.setAttribute('role', 'status');
    toastFeedback.setAttribute('aria-live', 'polite');
    const message = document.createElement('div'); message.id = 'toast-message';
    toastFeedback.append(message); document.body.append(toastFeedback);
  }
  const toastMessage = document.getElementById('toast-message');
  let toastTimer = null;

  function showToast(message) {
    if (!toastFeedback || !toastMessage) return;
    toastMessage.textContent = message;
    toastFeedback.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastFeedback.classList.remove('show');
    }, 4500);
  }

  installForms();
  const localNow = new Date();
  const localDate = `${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,'0')}-${String(localNow.getDate()).padStart(2,'0')}`;
  document.querySelectorAll('input[type=date][name*="date of birth"]').forEach(field => { field.max = localDate; });
  document.querySelectorAll('input[type=date][name="When would you like to visit?"]').forEach(field => { field.min = localDate; });

  document.querySelectorAll('.header-language-selector select').forEach(select => {
    select.addEventListener('change', () => {
      if (select.value === 'ar') {
        select.value = 'en';
        showToast('Arabic content is not available on this website. Please contact a campus for Arabic assistance.');
      }
    });
  });

  /* ============================================================
     12. CLOSE OFFCANVAS ON NAV LINK CLICK
     ============================================================ */
  document.querySelectorAll('.drawer-nav a, .drawer-footer a, .audience-pills a').forEach(link => {
    link.addEventListener('click', () => {
      closeOffcanvas();
    });
  });

  /* ============================================================
     13. ESCAPE KEY GLOBAL LISTENER
     ============================================================ */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOffcanvas();
      closeSearch();
      closeVideoModal();
      detailModal && closeDetailModal();
    }
  });

});

