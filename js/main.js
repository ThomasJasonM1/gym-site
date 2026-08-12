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

  /* ---- Click-to-copy phone number ---------------------------------------
     sms: links frequently do nothing on desktop, so the number is shown as
     large readable text with a copy affordance beside it. The button ships
     hidden in the HTML and is only revealed once a copy mechanism is known to
     exist — so with JS off, over file://, or on an insecure origin, no broken
     button ever appears and the tel:/sms: links still work.
     ---------------------------------------------------------------------- */
  const copyBtn    = document.getElementById('copyPhone');
  const copyStatus = document.getElementById('copyStatus');
  let   copyTimer;

  function canCopy() {
    if (navigator.clipboard && window.isSecureContext) return true;
    return !!(document.queryCommandSupported &&
              document.queryCommandSupported('copy'));
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // execCommand fallback. Required over plain http:// and file://, where
    // navigator.clipboard is undefined.
    return new Promise(function (resolve, reject) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand copy failed'));
    });
  }

  function setCopyState(label, announcement) {
    clearTimeout(copyTimer);
    copyBtn.classList.add('is-copied');
    copyBtn.querySelector('.copy-btn__label').textContent = label;
    copyStatus.textContent = announcement;
    copyTimer = setTimeout(function () {
      copyBtn.classList.remove('is-copied');
      copyBtn.querySelector('.copy-btn__label').textContent = 'Copy';
      copyStatus.textContent = '';
    }, 2500);
  }

  if (copyBtn && copyStatus && canCopy()) {
    copyBtn.hidden = false;
    copyBtn.addEventListener('click', function () {
      // Derived from the registry so the digits are never a second literal.
      const raw = (window.SITE && window.SITE.links.tel)
        ? window.SITE.links.tel.replace(/^tel:/, '')
        : '';
      copyText(raw).then(function () {
        setCopyState('Copied', 'Phone number copied to clipboard');
      }).catch(function () {
        const shown = (window.SITE && window.SITE.phoneDisplay) || raw;
        setCopyState('Select it', 'Copy failed. The number is ' + shown);
      });
    });
  }

  /* ---- Sticky action bar: get out of the keyboard's way ------------------
     The bar is position:fixed, so on mobile it floats above the on-screen
     keyboard and covers the very field being typed into. Slide it away while
     a form control in the page has focus.

     No scroll handling is needed: because the bar is fixed, window.innerHeight
     is unchanged and scroll-spy's threshold behaves identically. The only
     layout effect is body padding-bottom, which just adds scrollable space
     below the footer.
     ---------------------------------------------------------------------- */
  const actionBar = document.getElementById('actionBar');
  if (actionBar) {
    document.addEventListener('focusin', function (e) {
      if (e.target.closest('form')) actionBar.classList.add('is-hidden');
    });
    document.addEventListener('focusout', function () {
      // Deferred: during focusout, activeElement is briefly <body>, so an
      // immediate check would flicker the bar between two fields.
      setTimeout(function () {
        const el = document.activeElement;
        if (!el || !el.closest || !el.closest('form')) {
          actionBar.classList.remove('is-hidden');
        }
      }, 60);
    });
  }

  /* ---- Scroll-spy: highlight active nav link ---- */
  // Build a map of section id → nav link
  /* Must match the DOM order of the sections, and the nav order with it.
     A stale entry here breaks scroll-spy silently — there is no error. */
  const sectionIds = ['home', 'classes', 'training', 'gallery', 'pricing', 'contact'];

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
      const isCurrent = href === '#' + currentId;
      link.classList.toggle('active', isCurrent);
      // The visual active state is an underline plus a colour lift. Neither is
      // exposed to assistive tech, so state is carried by aria-current too.
      if (isCurrent) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
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

      // Endpoint comes from the registry, falling back to the form's own
      // action so the two can never disagree.
      const endpoint = (window.SITE && window.SITE.endpoints.contactForm) ||
                       contactForm.getAttribute('action');

      fetch(endpoint, {
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

  let formMessageTimer;

  /* Renders the status message INTO the aria-live region, so one node is both
     visible and announced. The previous version appended a visible <p> to the
     form and *also* mirrored the text into #formAnnounce, which meant screen
     readers got it twice. Colours now live in .form-message--* in the
     stylesheet rather than being injected as inline styles. */
  function showFormMessage(text, type) {
    const announce = document.getElementById('formAnnounce');
    if (!announce) return;

    clearTimeout(formMessageTimer);
    announce.className = 'form-message form-message--' + type;
    announce.textContent = text;

    formMessageTimer = setTimeout(function () {
      announce.className = '';
      announce.textContent = '';
    }, 5000);
  }

})();
