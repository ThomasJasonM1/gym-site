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

  /* ---- Link registry reconciliation -------------------------------------
     Every anchor carries a real literal href (so the page works with JS
     disabled) AND a data-link token naming its entry in js/site-config.js.
     This walks them and makes the config authoritative at runtime, so editing
     site-config.js alone is enough to change behaviour everywhere.

     Drift between a literal and the config is a real bug — the same class of
     bug that left nine carousel images 404ing — so it is reported loudly
     during development. Add ?linkcheck=1 to any URL to force the check on.
     ---------------------------------------------------------------------- */
  function syncLinks() {
    if (!window.SITE || !window.SITE.links) return;

    const dev = location.protocol === 'file:' ||
                /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ||
                /[?&]linkcheck=1/.test(location.search);

    let checked = 0, drifted = 0;

    document.querySelectorAll('a[data-link]').forEach(function (a) {
      const key  = a.getAttribute('data-link');
      const want = window.SITE.links[key];

      if (!want) {
        if (dev) console.error('[linkcheck] unknown token "' + key + '"', a);
        return;
      }

      checked++;
      if (a.getAttribute('href') !== want) {
        drifted++;
        if (dev) {
          console.warn(
            '[linkcheck] stale href for "' + key + '"' +
            '\n  in html: ' + a.getAttribute('href') +
            '\n  in config: ' + want +
            '\n  -> using config. Update the literal in index.html.', a
          );
        }
        a.setAttribute('href', want);
      }
    });

    if (dev) {
      console.log('[linkcheck] ' + checked + ' link(s) checked, ' +
                  drifted + ' drifted.');
    }
  }

  syncLinks();

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
  const sectionIds = ['home', 'gallery', 'classes', 'pricing', 'contact'];

  /* Measure the navbar rather than parsing the --nav-height token.
     getPropertyValue() returns the *specified* value, so a token written in
     any unit other than px silently mis-parses: parseInt('4.25rem') === 4,
     which breaks scroll-spy with no error. Measuring is also correct when the
     bar's height changes responsively. */
  function getNavHeight() {
    if (navbar) {
      const h = navbar.getBoundingClientRect().height;
      if (h > 0) return h;
    }
    return 68;
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

      const submitBtn = contactForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      fetch('https://formspree.io/f/meerenev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          _subject: 'Support Request from ' + name,
          _replyto: email
        })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          showFormMessage('Thanks, ' + name + '! Your message has been sent. We\'ll be in touch soon.', 'success');
          contactForm.reset();
        } else {
          showFormMessage('Something went wrong. Please try again or email us directly at info@countryfittx.com.', 'error');
        }
      })
      .catch(function () {
        showFormMessage('Could not send message. Please email us directly at info@countryfittx.com.', 'error');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      });
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFormMessage(text, type) {
    const announce = document.getElementById('formAnnounce');

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

    // Mirror text to aria-live region for screen readers
    if (announce) {
      announce.textContent = '';
      announce.textContent = text;
    }

    // Auto-remove after 5 s
    setTimeout(function () {
      msg.remove();
      if (announce) announce.textContent = '';
    }, 5000);
  }

  /* ---- Photo Carousel ---- */
  const carouselEl    = document.getElementById('carousel');
  const carouselTrack = document.getElementById('carouselTrack');
  const carouselPrev  = document.getElementById('carouselPrev');
  const carouselNext  = document.getElementById('carouselNext');
  const carouselDots  = document.getElementById('carouselDots');

  if (carouselEl && carouselTrack) {
    // Build slide elements from carousel-config.js (window.CAROUSEL_IMAGES)
    var imageList = (window.CAROUSEL_IMAGES || []).filter(Boolean);
    imageList.forEach(function (filename) {
      var slide = document.createElement('div');
      slide.className = 'carousel-slide';
      var img = document.createElement('img');
      img.src = filename;  // full relative path supplied by carousel-config.js
      img.alt = 'Country Fit gym';
      img.loading = 'lazy';
      slide.appendChild(img);
      carouselTrack.appendChild(slide);
    });

    var slides = carouselTrack.querySelectorAll('.carousel-slide');
    if (slides.length === 0) { carouselEl.style.display = 'none'; }  // hide if no images

    var current   = 0;
    var autoTimer = null;

    // Build dot indicators
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Photo ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); resetAuto(); });
      carouselDots.appendChild(dot);
    });

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      carouselTrack.style.transform = 'translateX(-' + (current * 100) + '%)';
      Array.prototype.forEach.call(carouselDots.querySelectorAll('.carousel-dot'), function (d, i) {
        d.classList.toggle('active', i === current);
      });
    }

    function startAuto() {
      autoTimer = setInterval(function () { goTo(current + 1); }, 4500);
    }

    function resetAuto() {
      clearInterval(autoTimer);
      startAuto();
    }

    if (carouselPrev) carouselPrev.addEventListener('click', function () { goTo(current - 1); resetAuto(); });
    if (carouselNext) carouselNext.addEventListener('click', function () { goTo(current + 1); resetAuto(); });

    // Pause auto-advance while hovering
    carouselEl.addEventListener('mouseenter', function () { clearInterval(autoTimer); });
    carouselEl.addEventListener('mouseleave', startAuto);

    // Swipe support for touch devices
    let touchStartX = 0;
    carouselEl.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      clearInterval(autoTimer);
    }, { passive: true });
    carouselEl.addEventListener('touchend', function (e) {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? goTo(current + 1) : goTo(current - 1); }
      startAuto();
    }, { passive: true });

    // Respect reduced-motion preference — skip autoplay
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      startAuto();
    }
  }

})();
