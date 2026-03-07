# Country Fit, LLC. — Project Context for Claude

## Business Details
- **Name:** Country Fit, LLC.
- **Domain:** countryfitusa.com
- **Address:** 2409 Country Road 645, Farmersville, TX 75442
- **Email:** hello@countryfitusa.com
- **Facebook:** https://www.facebook.com/profile.php?id=61578892311382
- **Theme:** Patriotic American — Red, White, and Blue

## Tech Stack
- Vanilla HTML5 / CSS3 / JavaScript — no frameworks, no build tools, no npm
- Google Fonts: Inter (400, 500, 600, 700, 800)
- Opened directly in browser (file:// protocol OK — no dev server needed)

## File Structure
```
gym-site/
├── index.html            # Single-page site — all 6 sections
├── css/
│   └── styles.css        # All styles (reset, variables, layout, sections, responsive)
├── js/
│   └── main.js           # Nav toggle, smooth scroll, scroll-spy, contact form
├── assets/
│   └── images/
│       ├── hero-bg.jpg               # Hero background image
│       ├── class-instructor-training.jpg
│       ├── outdoor-workout.jpg
│       ├── post-workout-2.jpg
│       ├── post-workout-group.jpg    # Used as gallery wide/featured image
│       ├── stock-photo-1.jpg
│       ├── stock-photo-2.jpg
│       └── stock-photo-3.jpg
└── CLAUDE.md             # This file
```

## Page Sections (in DOM order)
1. **Navbar** — fixed, dark navy, hamburger on mobile, scroll-spy active link
2. **Hero** — full-viewport, hero-bg.jpg with patriotic overlay, inline American flag SVG
3. **Patriot stripe** — red/white/blue CSS divider between hero and classes
4. **Classes** — 7-day schedule grid, collapses to 2-col on mobile
5. **Gallery** — photo grid on dark navy background, wide first image + 6 others
6. **Pricing** — 2 cards: Monthly Membership ($50→$25/mo first year) + Personal Training (contact)
7. **Contact** — address/hours/form left, Google Maps iframe right; includes Texas SVG with Farmersville star
8. **Footer** — dark navy, brand, quick links, social icons

## Design System (CSS Custom Properties)
```css
--color-primary:   #b22234;  /* American red */
--color-secondary: #3c3b6e;  /* American navy blue */
--color-accent:    #ffffff;  /* white */
--color-dark:      #0d0e1a;  /* near-black for hero/nav/gallery */
--color-light:     #f4f6fb;  /* off-white section backgrounds */
--color-text:      #1a1a2e;
--color-muted:     #6c757d;
--font-base:       'Inter', sans-serif;
--radius:          8px;
--shadow:          0 4px 24px rgba(0,0,0,0.12);
--nav-height:      68px;
--transition:      0.25s ease;
```

## Responsive Breakpoints
- Mobile-first
- `@media (min-width: 640px)` — footer columns
- `@media (min-width: 768px)` — tablet (pricing 2-col, contact 2-col, gallery 3-col)
- `@media (min-width: 1024px)` — desktop (not yet used explicitly)

## Important CSS Notes
- Hero background image path from CSS: `url('../assets/images/hero-bg.jpg')` (relative to css/ subdirectory)
- Image paths from HTML: `assets/images/filename.jpg` (relative to root)
- Gallery section uses dark background (`--color-dark`) — section title and sub text are white/muted white
- `scroll-margin-top: var(--nav-height)` applied to all sections for correct anchor scroll offset

## JavaScript (main.js)
- Scroll-spy section order: `['home', 'classes', 'gallery', 'pricing', 'contact']`
- Contact form does client-side validation only — no backend wired yet
- Footer year auto-populated via `new Date().getFullYear()`

## Pricing (current)
- **Monthly Membership:** ~~$50/mo~~ → **$25/mo** for first year ("Founding Member Special")
- **Personal Training:** Contact for Pricing

## Patriotic / Texas Design Elements
- Inline American flag SVG (bottom-right of hero, 50-star accurate layout)
- Red/white/blue CSS stripe divider after hero
- Texas outline SVG in contact section with ★ star marking Farmersville (NE Texas)
- Color scheme throughout references flag colors

## Git / Deploy
- Repo: https://github.com/ThomasJasonM1/gym-site
- Branch: main
- Deploy target: countryfitusa.com (not yet configured)
- Google Maps iframe src uses address-based embed — swap with API key embed before launch if needed
