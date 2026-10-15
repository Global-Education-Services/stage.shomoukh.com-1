import { createDialogController } from './ui-dialogs.js';

// Shomoukh Nursery School Interactivity & Modal Handlers
document.addEventListener('DOMContentLoaded', () => {
  const dialogs = createDialogController();

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
    dialogs.open(offcanvasDrawer, menuCloseBtn);
    if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeOffcanvas() {
    if (!offcanvasDrawer) return;
    offcanvasDrawer.classList.remove('open');
    offcanvasDrawer.setAttribute('aria-hidden', 'true');
    dialogs.close(offcanvasDrawer);
    if (menuToggleBtn) menuToggleBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuToggleBtn) menuToggleBtn.addEventListener('click', openOffcanvas);
  if (menuCloseBtn) menuCloseBtn.addEventListener('click', closeOffcanvas);

  // Submenu Accordions inside Drawer
  // Measure the existing links so wrapping and touch targets are never clipped.
  function sizeSubmenus() {
    document.querySelectorAll('.submenu-dropdown').forEach(menu => {
      menu.style.setProperty('--submenu-height', `${menu.scrollHeight}px`);
    });
  }
  sizeSubmenus();
  window.addEventListener('resize', sizeSubmenus, { passive: true });
  document.fonts?.ready.then(sizeSubmenus);
  document.querySelectorAll('.submenu-dropdown').forEach(menu => { menu.inert = !menu.closest('.drawer-menu-item').classList.contains('active'); });
  const submenuToggles = document.querySelectorAll('.submenu-toggle-btn');
  submenuToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const parentItem = toggle.closest('.drawer-menu-item');
      const isCurrentlyActive = parentItem.classList.contains('active');
      const submenu = parentItem.querySelector('.submenu-dropdown');

      document.querySelectorAll('.drawer-menu-item.active').forEach(item => {
        if (item !== parentItem) {
          item.classList.remove('active');
          const otherMenu = item.querySelector('.submenu-dropdown');
          if (otherMenu) otherMenu.inert = true;
          const btn = item.querySelector('.submenu-toggle-btn');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });

      if (isCurrentlyActive) {
        parentItem.classList.remove('active');
        if (submenu) submenu.inert = true;
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        sizeSubmenus();
        parentItem.classList.add('active');
        if (submenu) submenu.inert = false;
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
    dialogs.open(searchModal, searchInput);
  }

  function closeSearch() {
    if (!searchModal) return;
    searchModal.classList.remove('open');
    searchModal.setAttribute('aria-hidden', 'true');
    dialogs.close(searchModal);
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener('click', openSearch);
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
  if (searchBackdrop) searchBackdrop.addEventListener('click', closeSearch);

  // Close search on quick-tag click
  document.querySelectorAll('.search-quick-tags a').forEach(tag => {
    tag.addEventListener('click', closeSearch);
  });

  const searchForm = document.getElementById('search-form');
  const searchResults = document.getElementById('search-results');
  const searchPages = [
    { title: 'About Shomoukh', href: '/about.html', words: 'about philosophy mission vision values safety' },
    { title: 'Programs & Curriculum', href: '/programs.html', words: 'program programs curriculum eyfs reggio teacher learning' },
    { title: 'Ages & Schedules', href: '/programs.html#ages', words: 'age ages infant infants toddler toddlers preschool preschoolers hours schedule schedules flex care' },
    { title: 'Ateliers & Enrichments', href: '/enrichments.html', words: 'atelier ateliers enrichments enrichment art clay music drama sensory' },
    { title: 'Learning Spaces', href: '/spaces.html', words: 'space spaces facility facilities piazza garden playground' },
    { title: 'Admissions', href: '/admissions.html', words: 'admission admissions fees payment documents registration' },
    { title: 'Book a Visit', href: '/book-a-visit.html', words: 'tour book booking visit' },
    { title: 'Apply Online', href: '/apply-online.html', words: 'apply application enrollment enrolment enroll register' },
    { title: 'Parents Portal', href: '/parents.html', words: 'parent parents portal app ios android login' },
    { title: 'Contact & Campuses', href: '/contact.html', words: 'contact campus campuses mouj qurm qurum phone email location inquiry' }
  ];
  searchForm?.addEventListener('submit', event => {
    event.preventDefault();
    const query = searchInput.value.trim();
    const tokens = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const matches = tokens.length ? searchPages.filter(page => {
      const words = page.words.split(' ');
      return tokens.every(token => words.includes(token));
    }) : [];
    if (matches.length > 0) {
      window.location.href = matches[0].href;
      return;
    }
    searchResults.replaceChildren();
    const message = document.createElement('p');
    message.textContent = !tokens.length ? 'Enter a topic to search.' : `No matching pages for “${query}”. Try admissions, ages, programs or contact.`;
    searchResults.append(message);
    const list = document.createElement('ul');
    for (const match of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = match.href;
      link.textContent = match.title;
      link.addEventListener('click', closeSearch);
      item.append(link); list.append(item);
    }
    searchResults.append(list);
  });

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
    dialogs.open(videoModal, videoModalClose);
    if (lightboxVideo) {
      lightboxVideo.currentTime = 0;
      lightboxVideo.play().catch(e => console.log('Video play interrupted:', e));
    }
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('open');
    videoModal.setAttribute('aria-hidden', 'true');
    dialogs.close(videoModal);
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
    heroBgVideo.addEventListener('timeupdate', () => {
      if (heroBgVideo.duration && heroBgVideo.currentTime >= heroBgVideo.duration - 0.25) {
        heroBgVideo.currentTime = 0;
        heroBgVideo.play().catch(() => {});
      }
    });

    heroBgVideo.addEventListener('ended', () => {
      heroBgVideo.currentTime = 0;
      heroBgVideo.play().catch(() => {});
    });
  }

  if (heroVideoToggleBtn && heroBgVideo) {
    const syncVideoButton = () => {
      const paused = heroBgVideo.paused;
      heroVideoToggleBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
      heroVideoToggleBtn.innerHTML = paused
        ? '<i class="fa-solid fa-play" aria-hidden="true"></i> <span>PLAY VIDEO</span>'
        : '<i class="fa-solid fa-pause" aria-hidden="true"></i> <span>PAUSE VIDEO</span>';
    };
    heroBgVideo.addEventListener('play', syncVideoButton);
    heroBgVideo.addEventListener('pause', syncVideoButton);
    heroVideoToggleBtn.addEventListener('click', () => {
      if (heroBgVideo.paused) heroBgVideo.play().catch(syncVideoButton);
      else heroBgVideo.pause();
      syncVideoButton();
    });
    syncVideoButton();
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

    dialogs.open(detailModal, detailModalClose);
  }

  function closeDetailModal() {
    if (!detailModal) return;
    detailModal.classList.remove('open');
    detailModal.setAttribute('aria-hidden', 'true');
    dialogs.close(detailModal);
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
  const toastFeedback = document.getElementById('toast-feedback');
  const toastMessage = document.getElementById('toast-message');
  let toastTimer = null;

  function showToast(message, isSuccess = true) {
    if (!toastFeedback || !toastMessage) return;
    toastMessage.textContent = message;
    const icon = toastFeedback.querySelector('i');
    if (icon) icon.className = isSuccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-info';
    toastFeedback.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastFeedback.classList.remove('show');
    }, 4500);
  }

  /* ============================================================
     9. TOUR BOOKING FORM HANDLER
     ============================================================ */
  // This static site has no submission service. Validate without claiming delivery
  // or discarding the visitor's information.
  document.querySelectorAll('#tour-booking-form, #online-enrollment-form, #contact-inquiry-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      showToast('Online submission is currently unavailable. Nothing has been sent. Please contact your selected campus; your entries have been kept.', false);
    });
  });

  /* ============================================================
     11. CONTACT INQUIRY FORM & 180-CHAR COUNTER
     ============================================================ */
  const contactForm = document.getElementById('contact-inquiry-form');
  const contactMsg = document.getElementById('contact-message');
  const charCounter = document.getElementById('contact-char-count');

  if (contactMsg && charCounter) {
    contactMsg.addEventListener('input', () => {
      charCounter.textContent = contactMsg.value.length;
    });
  }

  if (contactForm && contactMsg) {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject')?.trim();
    const inquiry = params.get('inquiry')?.trim();
    const message = subject || inquiry;
    if (message) {
      contactMsg.value = message.slice(0, contactMsg.maxLength);
      if (charCounter) charCounter.textContent = contactMsg.value.length;
    }
  }

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

