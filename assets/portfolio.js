(() => {
  'use strict';

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !motionPreference.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
    document.documentElement.classList.add('js');
  }

  const overlays = [...document.querySelectorAll('.showcase-overlay')];
  const pageRegions = [...document.querySelectorAll('body > nav, body > header, body > main, body > footer, body > .skip-link')];
  const viewer = document.getElementById('media-viewer');
  let activeOverlay = null;
  let previousFocus = null;

  const focusableElements = container => [...container.querySelectorAll(
    'a[href], button:not([disabled]), video[controls], input:not([disabled]), [tabindex="0"]'
  )].filter(element => element.getClientRects().length && !element.closest('[inert]'));

  function openShowcase(id, trigger) {
    const overlay = document.getElementById(id);
    if (!overlay || activeOverlay) return;
    previousFocus = trigger;
    activeOverlay = overlay;
    overlay.inert = false;
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
    overlay.querySelector('.sheet-close').focus({ preventScroll: true });
    pageRegions.forEach(region => { region.inert = true; });
  }

  function closeShowcase() {
    if (!activeOverlay) return;
    const overlay = activeOverlay;
    if (viewer.open) viewer.close();
    overlay.querySelectorAll('video').forEach(video => video.pause());
    pageRegions.forEach(region => { region.inert = false; });
    document.body.classList.remove('drawer-open');
    if (previousFocus) {
      previousFocus.setAttribute('aria-expanded', 'false');
      previousFocus.focus({ preventScroll: true });
    }
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
    activeOverlay = null;
  }

  document.querySelectorAll('[data-showcase]').forEach(trigger => {
    trigger.addEventListener('click', () => openShowcase(trigger.dataset.showcase, trigger));
  });
  overlays.forEach(overlay => {
    overlay.querySelectorAll('.sheet-close, .sheet-backdrop, .sheet-cta').forEach(control => {
      control.addEventListener('click', closeShowcase);
    });
    overlay.querySelectorAll('.sheet-chapters a').forEach(link => {
      link.addEventListener('click', event => {
        const target = document.getElementById(link.hash.slice(1));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth', block: 'start' });
      });
    });
  });

  document.addEventListener('keydown', event => {
    if (!activeOverlay || viewer.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeShowcase();
    } else if (event.key === 'Tab') {
      const items = focusableElements(activeOverlay.querySelector('.kalow-sheet'));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Only one video plays at a time. Leaving the showcase always stops its audio.
  const videos = [...document.querySelectorAll('.showcase-overlay video')];
  videos.forEach(video => {
    video.addEventListener('play', () => videos.forEach(other => {
      if (other !== video) other.pause();
    }));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(video => video.pause());
  });

  const galleryLinks = [...document.querySelectorAll('[data-gallery]')];
  const viewerImage = document.getElementById('viewer-image');
  const viewerTitle = document.getElementById('viewer-title');
  const viewerDescription = document.getElementById('viewer-description');
  const viewerCount = document.getElementById('viewer-count');
  const thumbnails = viewer.querySelector('.viewer-thumbnails');
  let gallery = [];
  let galleryIndex = 0;
  let galleryTrigger = null;

  function showPhoto(index) {
    galleryIndex = (index + gallery.length) % gallery.length;
    const link = gallery[galleryIndex];
    viewerImage.src = link.href;
    viewerImage.alt = link.querySelector('img').alt;
    viewerTitle.textContent = link.dataset.title;
    viewerDescription.textContent = link.dataset.description;
    viewerCount.textContent = `Photo ${galleryIndex + 1} of ${gallery.length}`;
    [...thumbnails.children].forEach((thumbnail, i) => {
      thumbnail.setAttribute('aria-current', String(i === galleryIndex));
    });
  }

  galleryLinks.forEach(link => {
    link.addEventListener('click', event => {
      // Keep the regular file link usable in a browser without native dialog support.
      if (typeof viewer.showModal !== 'function') return;
      event.preventDefault();
      galleryTrigger = link;
      gallery = galleryLinks.filter(item => item.dataset.gallery === link.dataset.gallery);
      thumbnails.replaceChildren();
      gallery.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `View photo ${index + 1}: ${item.dataset.title}`);
        const image = document.createElement('img');
        image.src = item.querySelector('img').src;
        image.alt = '';
        button.append(image);
        button.addEventListener('click', () => showPhoto(index));
        thumbnails.append(button);
      });
      videos.forEach(video => video.pause());
      showPhoto(gallery.indexOf(link));
      viewer.showModal();
      viewer.querySelector('.viewer-close').focus();
    });
  });
  viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.querySelector('.viewer-previous').addEventListener('click', () => showPhoto(galleryIndex - 1));
  viewer.querySelector('.viewer-next').addEventListener('click', () => showPhoto(galleryIndex + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showPhoto(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('click', event => {
    const bounds = viewer.getBoundingClientRect();
    if (event.target === viewer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) viewer.close();
  });
  viewer.addEventListener('close', () => {
    if (galleryTrigger && activeOverlay) galleryTrigger.focus({ preventScroll: true });
  });

  // Scroll-linked portrait reveal; the page itself retains normal native scrolling.
  const story = document.getElementById('iteration-story');
  const stage = story.querySelector('.iteration-stage');
  let storyVisible = true;
  let scheduledFrame = false;
  function updatePortrait() {
    scheduledFrame = false;
    if (motionPreference.matches) {
      ['--portrait-scale', '--photo-crop', '--shade-opacity'].forEach(property => story.style.removeProperty(property));
      return;
    }
    const bounds = story.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    const distance = Math.max(1, bounds.height - stage.offsetHeight);
    const progress = Math.min(1, Math.max(0, (stickyTop - bounds.top) / distance));
    story.style.setProperty('--portrait-scale', (1.24 - progress * .24).toFixed(3));
    story.style.setProperty('--photo-crop', `${(10 * (1 - progress)).toFixed(2)}%`);
    story.style.setProperty('--shade-opacity', (1 - progress * .18).toFixed(3));
  }
  function schedulePortrait() {
    if (!scheduledFrame && storyVisible) {
      scheduledFrame = true;
      requestAnimationFrame(updatePortrait);
    }
  }
  if ('IntersectionObserver' in window) {
    const storyObserver = new IntersectionObserver(entries => {
      storyVisible = entries[0].isIntersecting;
      if (storyVisible) schedulePortrait();
    }, { rootMargin: '100px' });
    storyObserver.observe(story);
  }
  window.addEventListener('scroll', schedulePortrait, { passive: true });
  window.addEventListener('resize', updatePortrait, { passive: true });
  motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) revealItems.forEach(item => item.classList.add('is-visible'));
    updatePortrait();
  });
  updatePortrait();
})();
