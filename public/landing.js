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

  const canTilt = !prefersReducedMotion;

  if (canTilt) {
    document.querySelectorAll('[data-pointer-tilt]').forEach(element => {
      const maxTilt = Number(element.dataset.pointerTilt) || 4;

      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - .5) * maxTilt * 2;
        const rotateX = (.5 - y) * maxTilt * 2;
        const rotateZ = (x - .5) * maxTilt * .22;

        element.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
        element.style.setProperty('--tilt-z', `${rotateZ.toFixed(2)}deg`);
      });

      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--tilt-x', '0deg');
        element.style.setProperty('--tilt-y', '0deg');
        element.style.setProperty('--tilt-z', '0deg');
      });
    });
  }
