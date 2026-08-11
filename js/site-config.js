/* ============================================================================
   Country Fit — SITE CONFIG
   ----------------------------------------------------------------------------
   CANONICAL VALUES FOR EVERY EXTERNAL URL AND CONTACT DETAIL ON THIS SITE.

   How the single-source rule works here
   -------------------------------------
   This is a static site with no build step, so nothing can make one URL
   literally appear in four places in the HTML. Instead:

     1. Each link is declared ONCE in `links` below.
     2. Each anchor in index.html carries BOTH a real literal href AND a
        matching  data-link="<token>"  attribute.
     3. On load, syncLinks() in main.js reconciles every [data-link] against
        this file. The config always wins at runtime, and any drifted literal
        logs a console warning during development.

   Why the literal href is still required: the page must work with JavaScript
   disabled. An empty href populated by JS would be a dead link.

   TO CHANGE A URL: edit it here first, then update the matching literal href
   in index.html. Load the page with ?linkcheck=1 to confirm nothing drifted.
   ========================================================================= */

window.SITE = {

  /* Live origin. Used for canonical, Open Graph, and JSON-LD.
     Confirmed 2026-08-10: countryfitusa.com has no DNS record; countryfittx.com
     is the registered domain and matches the contact email. */
  origin: 'https://countryfittx.com',

  links: {

    /* ---------------------------------------------------------------------
       CONFIRMED DESTINATION — this is not a placeholder.

       Checked against the live page 2026-08-10: PushPress lists "Free Trial"
       ($0.00, 1 session) as a product ON this plans page, alongside Drop In
       ($15) and Monthly Unlimited ($125). Selecting it opens a modal without
       changing the URL, and no per-plan deep link is exposed, so this page is
       the only entry point that exists. Client reviewed and chose to keep it.

       If a Free-Trial-only plan category is ever created in PushPress, its
       ?category=... URL would land visitors on that single option — swap it in
       here and in the four literal hrefs in index.html.

       FOUR consumers: nav button, hero CTA, post-schedule CTA, sticky bar.
       User-facing label is "Claim Your Free Class" (or "Free Class" in the
       compact nav and action bar). Never "free trial" or "trial class" —
       one name for one thing.
       ------------------------------------------------------------------ */
    'free-class': 'https://45bu3fl.pushpress.com/landing/plans?category=plcat_f918a2471c6940',

    /* Secondary link in the Group Classes section. Same destination as
       'free-class' today, but a separate token on purpose: when the real
       free-trial URL lands, only 'free-class' changes and this stays put. */
    'plans': 'https://45bu3fl.pushpress.com/landing/plans?category=plcat_f918a2471c6940',

    /* Personal Training — Google Appointment Schedule. */
    'pt-booking': 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3WaY-00i-Hgx6BXdubojd7NX3HRsvsUCsdFgA8M-nCv5QfgDdKRFaXDIscO7tVD5Dk-t60jDq8',

    /* The "?&" before body= is the cross-platform-safe form and is deliberate.
       Do NOT "correct" it to "?body=" — iOS Messages historically drops the
       body with a bare "?". Prefilled body text is best-effort regardless: iOS
       and Android honour it, most desktop handlers ignore it, and some carrier
       apps silently drop it. The link still opens a message to the right
       number in every case, which is the part that matters.
       NOTE: in index.html this "&" must be written "&amp;". */
    'sms': 'sms:+14693375839?&body=Hi%20Country%20Fit%2C%20I%27d%20like%20more%20info%20about%20group%20classes.',

    /* Plain fallback with no prefill, for anywhere the body text misbehaves. */
    'sms-plain': 'sms:+14693375839',

    'tel':   'tel:+14693375839',
    'email': 'mailto:info@countryfittx.com',

    /* Street corrected to "County Road" 2026-08-10, confirmed by the client.
       It previously read "Country Road" here, in the visible address, and in
       the JSON-LD. If you change it, change all three together — this query
       string and the literal href in index.html are compared by syncLinks(). */
    'directions': 'https://maps.google.com/maps?q=2409+County+Road+645,+Farmersville,+TX+75442',

    'facebook': 'https://www.facebook.com/profile.php?id=61578892311382'
  },

  /* Display strings. Used where JS has to construct text; the HTML carries its
     own literal so these are never the only copy. */
  phoneDisplay: '(469) 337-5839',
  emailDisplay: 'info@countryfittx.com',

  endpoints: {
    contactForm: 'https://formspree.io/f/meerenev'
  }
};
