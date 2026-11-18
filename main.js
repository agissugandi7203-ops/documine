document.addEventListener('DOMContentLoaded', () => {
  // 1) Mobile Menu Management
  const burgerBtn = document.querySelector('.burger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-signin-btn');

  function openMenu() {
    if (!burgerBtn || !mobileMenu || !mobileOverlay) return;
    burgerBtn.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    mobileOverlay.classList.add('open');
    mobileMenu.removeAttribute('hidden');
    mobileOverlay.removeAttribute('hidden');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    if (!burgerBtn || !mobileMenu || !mobileOverlay) return;
    burgerBtn.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileOverlay.classList.remove('open');
    mobileMenu.setAttribute('hidden', '');
    mobileOverlay.setAttribute('hidden', '');
    document.body.classList.remove('menu-open');
  }

  function toggleMenu() {
    const isExpanded = burgerBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  if (burgerBtn) {
    burgerBtn.addEventListener('click', toggleMenu);
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeMenu);
  }

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) {
      closeMenu();
    }
  });

  // 2) Stats Count-up with easeOutCubic
  function countUp(el, target, decimals, duration, delay) {
    setTimeout(() => {
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = ease * target;
        el.textContent = current.toFixed(decimals);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target.toFixed(decimals);
        }
      }
      requestAnimationFrame(step);
    }, delay);
  }

  const statItems = document.querySelectorAll('.stat-item');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statItems.forEach((item, index) => {
            const target = parseFloat(item.dataset.target);
            const decimals = parseInt(item.dataset.decimals, 10);
            const numEl = item.querySelector('.stat-number');
            const duration = 1500 + index * 80;
            const delay = 480 + index * 90;
            if (numEl && !isNaN(target)) {
              countUp(numEl, target, decimals, duration, delay);
            }
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.25 });

    const statsFooter = document.querySelector('.stats-footer');
    if (statsFooter) {
      observer.observe(statsFooter);
    }
  } else {
    // Fallback if IntersectionObserver not supported
    statItems.forEach((item, index) => {
      const target = parseFloat(item.dataset.target);
      const decimals = parseInt(item.dataset.decimals, 10);
      const numEl = item.querySelector('.stat-number');
      const duration = 1500 + index * 80;
      const delay = 480 + index * 90;
      if (numEl && !isNaN(target)) {
        countUp(numEl, target, decimals, duration, delay);
      }
    });
  }
});
