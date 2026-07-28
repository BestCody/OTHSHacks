document.documentElement.classList.add("js");

const menuButton = document.getElementById('menu-btn');
  const navLinks = document.getElementById('nav-links');

  function closeMenu() {
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }

  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    document.body.classList.toggle('menu-open', isOpen);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });

  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const selector = link.getAttribute('href');
      if (!selector || selector === '#') return;

      const target = document.querySelector(selector);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });

      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    });
  });

  if (window.location.hash) {
    const initialTarget = document.querySelector(window.location.hash);
    if (initialTarget) {
      requestAnimationFrame(() => {
        initialTarget.scrollIntoView({ block: 'start' });
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      });
    }
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08 });

  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));

  document.querySelectorAll('details').forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      document.querySelectorAll('details[open]').forEach(openItem => {
        if (openItem !== item) openItem.open = false;
      });
    });
  });

  const tiltClasses = [
    'tilt-top-left',
    'tilt-top-right',
    'tilt-bottom-left',
    'tilt-bottom-right',
  ];

  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-pointer-tilt]').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const horizontal = event.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
        const vertical = event.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';

        element.classList.remove(...tiltClasses);
        element.classList.add(`tilt-${vertical}-${horizontal}`);
      });

      element.addEventListener('pointerleave', () => {
        element.classList.remove(...tiltClasses);
      });
    });
  }
