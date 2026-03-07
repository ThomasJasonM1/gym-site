/* ============================================================
   Country Fit, LLC. — main.js
   Features: mobile nav toggle, smooth scroll, scroll-spy
   ============================================================ */

(function () {
  'use strict';

  /* ---- Elements ---- */
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');
  const navLinks  = document.querySelectorAll('.nav-link');
  const footerYear = document.getElementById('footerYear');

  /* ---- Footer year ---- */
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  /* ---- Mobile nav toggle ---- */
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      const isOpen = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when a link is tapped
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target)) {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Scroll-spy: highlight active nav link ---- */
  // Build a map of section id → nav link
  const sectionIds = ['home', 'classes', 'pricing', 'contact'];

  function getNavHeight() {
    return parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
      10
    ) || 68;
  }

  function updateActiveLink() {
    const scrollY     = window.scrollY;
    const navHeight   = getNavHeight();
    const windowH     = window.innerHeight;
    let   currentId   = sectionIds[0];

    // Walk through sections; the last one whose top is above the midpoint wins
    for (const id of sectionIds) {
      const section = document.getElementById(id);
      if (!section) continue;
      const rect = section.getBoundingClientRect();
      if (rect.top <= navHeight + windowH * 0.25) {
        currentId = id;
      }
    }

    navLinks.forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === '#' + currentId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Throttle scroll handler for performance
  let ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Set correct active link on page load
  updateActiveLink();

  /* ---- Contact form: basic client-side feedback ---- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name    = contactForm.querySelector('#name').value.trim();
      const email   = contactForm.querySelector('#email').value.trim();
      const message = contactForm.querySelector('#message').value.trim();

      if (!name || !email || !message) {
        showFormMessage('Please fill in all fields.', 'error');
        return;
      }

      if (!isValidEmail(email)) {
        showFormMessage('Please enter a valid email address.', 'error');
        return;
      }

      // Simulate submission success (replace with real fetch/POST when backend is ready)
      showFormMessage('Thanks, ' + name + '! We\'ll be in touch soon.', 'success');
      contactForm.reset();
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFormMessage(text, type) {
    // Remove any existing message
    const existing = contactForm.querySelector('.form-message');
    if (existing) existing.remove();

    const msg = document.createElement('p');
    msg.className = 'form-message form-message--' + type;
    msg.textContent = text;
    msg.style.cssText = [
      'margin-top: 0.75rem',
      'padding: 0.65rem 1rem',
      'border-radius: 6px',
      'font-size: 0.9rem',
      'font-weight: 500',
      type === 'success'
        ? 'background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;'
        : 'background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;'
    ].join('; ');

    contactForm.appendChild(msg);

    // Auto-remove after 5 s
    setTimeout(function () {
      msg.remove();
    }, 5000);
  }

})();
