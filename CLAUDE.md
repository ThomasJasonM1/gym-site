# Country Fit, LLC. — Project Context for Claude

## Business

- **Name:** Country Fit, LLC.
- **Address:** 2409 County Road 645, Farmersville, TX 75442
  (it read "Country Road" until 2026-08-10; client confirmed **County**)
- **Phone / SMS:** 469-337-5839 — texting is the preferred contact method
- **Email:** info@countryfittx.com
- **Domain:** `countryfittx.com`. ⚠️ `countryfitusa.com` has **no DNS record** —
  it does not exist. Canonical, OG and JSON-LD all use countryfittx.com.
- **Facebook:** https://www.facebook.com/profile.php?id=61578892311382
- **Brand:** teal / black / white grunge, matching the gym's printed workout
  boards and class posters.

## Tech stack

Vanilla HTML5 / CSS3 / JavaScript. **No framework, no build step, no npm.**

> ### ⚠️ Preview over a local server, never `file://`
> ```
> python -m http.server 8000     # then open http://localhost:8000
> ```
> Chrome treats every `file://` document as an opaque origin, so the
> self-hosted `@font-face` files are CORS-blocked and the whole site silently
> falls back to Impact / system-ui. It looks broken but isn't.

## File map

```
gym-site/
├── index.html              the only page
├── css/styles.css          the only stylesheet
├── js/
│   ├── site-config.js      link registry — loads FIRST
│   └── main.js             nav, scroll-spy, copy-to-clipboard, form
├── assets/
│   ├── img/                DERIVED, COMMITTED — what actually ships
│   ├── images/             CAMERA ORIGINALS — gitignored, never deployed
│   ├── fonts/              Anton 400, Barlow 400/600 (latin, 62 KB)
│   └── textures/           two seamless grain tiles (17 KB)
├── tools/                  local authoring only, never deployed
│   ├── build-images.py     originals -> WebP/JPEG (needs Pillow, pillow-heif)
│   ├── build-textures.py   regenerates the grain tiles
│   └── preflight.ps1       pre-deploy asset check
└── favicon.ico / favicon.svg
```

## Page sections, in DOM order

| id | Heading | Notes |
|---|---|---|
| `home` | **h1 Group Classes** | The hero *is* the classes pitch, deliberately. `68svh`, not full height, so the schedule below breaks the fold. |
| `classes` | h2 Class Schedule | Schedule boards, arrow, free-class CTA + plans link, the client's verbatim copy, three feature panels, photo strip |
| `training` | h2 Personal Training | Also carries `#schedule` as an alias — see gotchas |
| `gallery` | h2 Our Gym | Photo grid |
| `pricing` | h2 Online Training Plans | Five Everfit packages |
| `contact` | h2 Find Us | Text-us board, address, email, Formspree form |

**Nav order, footer links, and `sectionIds` in `main.js` must all match this
order.** A stale `sectionIds` breaks scroll-spy silently — there is no error.

## Design system

Read the header comment at the top of `css/styles.css` before changing colour.
The house rules there are load-bearing:

- **No hex literals outside `:root`.** Everything resolves from a token.
- **No border-radius, no gradients, no soft shadows.** Flat ink, hard edges.
- **Bone for display and emphasis, gray for running text, never pure white.**
- **Brand teal `#00686D` is 2.88:1 on the page background.** It is a FILL and
  DECORATION colour only — never text, never a lone state indicator, never a
  focus ring. Use `--cf-teal-bright` (6.4:1) for anything text-shaped. The
  teal was sampled from the client's actual signage, not picked.

Tokens are three layers: raw channels → derived opaque → semantic aliases.
Components use **only** the semantic layer, which is why `prefers-contrast:
more` can re-point a few raw channels and have everything downstream follow.

`--nav-height` is measured by `getBoundingClientRect()` in `main.js`, not
parsed from the token — `parseInt('4.25rem')` would return `4`.

### The board component
Outlined dark panel + teal header bar with a line icon. It is the signature
element, meant to rhyme with the boards hanging in the gym. Used by the
schedule, the feature panels, the pricing cards and the contact form.
**Never add `overflow:hidden` or `clip-path` to `.board`** — both clip the
offset focus ring of anything inside it.

## The link registry

Every external URL and contact detail is declared once in `js/site-config.js`.
Each anchor in the HTML carries **both** a real literal `href` (so the page
works with JavaScript disabled) **and** a `data-link="token"`. On load,
`syncLinks()` reconciles them; the config wins at runtime and any drift logs a
console warning.

```
http://localhost:8000/?linkcheck=1     # audits every [data-link] anchor
```

To change a URL: edit `site-config.js` **and** the matching literal `href`.
The Google Maps query string counts — it is compared too.

## The class schedule

The times live in **exactly one place**: the `<dl class="schedule">` in
`#classes`, with `<time datetime>` on every slot. The JSON-LD
`openingHoursSpecification` sits immediately after it in the same section —
deliberately adjacent, so both representations land in one screenful and one
diff hunk. **Change the schedule ⇒ change both, same commit.**

It is plain HTML, not a JS array, because the page must work with JS disabled.

## Gotchas

- **`#schedule` resolves to Personal Training, not the class schedule.** It is
  a backwards-compatibility alias: that id used to be on the old section titled
  "Schedule", which became Personal Training. Kept so external links survive.
- **Class duration in the JSON-LD is an assumed 60 minutes.** Nothing visible
  depends on it; change the `closes` values if that is wrong.
- **The free-class URL is the PushPress *plans* page, and that is correct.**
  Free Trial ($0.00) is one of three products on it. No per-plan deep link
  exists. Confirmed with the client 2026-08-10 — do not "fix" this.
- **Star separators are CSS-generated** (`.eyebrow`), never typed into the DOM.
  As literal characters a screen reader announces "black star" between every
  phrase.
- All-caps is applied in CSS, never in the DOM — VoiceOver spells short
  all-caps strings out as initialisms.

## Deploy

Bluehost `public_html`, manual upload.

```powershell
.\tools\preflight.ps1        # MUST pass before uploading
```

Bluehost is a **case-sensitive** filesystem; Windows and git are not. Preflight
compares every asset reference against the real directory listing with exact
case. This is not theoretical — nine carousel images shipped as `.JPG` while
referenced as `.jpg` and 404'd in production for months.

Upload everything **except** `assets/images/`, `tools/`, and dotfiles.

## Regenerating images

```
pip install Pillow pillow-heif
python tools/build-images.py --list
python tools/build-images.py --contact-sheet         # previews to review
python tools/build-images.py IMG_1072.HEIC --name hero-overhead-press \
       --preset hero-tall --focus 0.3
```

Applies then discards EXIF rotation, strips all metadata, converts to sRGB, and
emits WebP + JPEG at preset widths under a byte budget. `--focus` biases the
crop along the trimmed axis — a plain centre crop of a portrait into a 1.9:1
share card lands on the subject's chin.

## Accessibility floor

Visible focus on every control, 44×44 tap targets, 4.5:1 body text and 3:1
large text, alt text on every image, `prefers-reduced-motion` respected, and
the page fully usable with JavaScript disabled. All of it is currently met —
verified by measuring the rendered page, not by inspection. Keep it that way.
