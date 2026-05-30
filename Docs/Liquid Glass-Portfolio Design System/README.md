# Liquid Glass — Khalid Al Dosari Portfolio Design System

A design system distilled from the **Khalid Al Dosari personal portfolio** — a single-page,
dark-themed, *"liquid glass"* static site. It captures the brand's fonts, colors, glass material,
iconography, content voice, and a faithful UI-kit recreation so any agent can generate
on-brand interfaces and assets.

> **What "Liquid Glass" is:** a premium dark aesthetic built on frosted, translucent surfaces
> floating over an ambient cyan/blue/violet glow. Surfaces are never flat opaque blocks — they
> are glass that refracts the colored light behind them.

---

## 1. Product context

| | |
|---|---|
| **Owner / subject** | Khalid Al Dosari — خالد آل دوســـــري |
| **Role positioning** | CS Student · Data Scientist · AI Engineer |
| **What it is** | A single-page personal portfolio (About, Education, Projects, Experience, Certifications, Skills, Languages) |
| **Tech** | Vanilla HTML / CSS / JS — *no framework, no build step*. Hosted on Cloudflare via Wrangler. |
| **Identity** | Bilingual (English + Arabic). IMSIU senior CS student, Riyadh, Saudi Arabia. |

It is one product: a marketing/identity website. There is no app, no docs site. The design
system therefore centers on **one UI kit** — the portfolio website itself — broken into reusable
glass components (navbar, hero, cards, timeline, tags, buttons, mobile drawer).

### Sources used to build this system
- **GitHub — portfolio (private):** https://github.com/khaliddosari/portfolio
  (`prd/PRD.md`, `static/index.html`, `static/styles.css`, `static/script.js`, image assets)
- **GitHub — brand fonts:** https://github.com/khaliddosari/thmanyah-fonts
  (Thmanyah typeface, served live via jsDelivr `@v1`)
- **Uploaded:** the Thmanyah `.otf` font files + the hero portrait (`photo.jpg`)

> Explore those repositories directly for the highest-fidelity source of truth — especially
> `prd/PRD.md`, which is an exhaustive project knowledge base maintained alongside the code.

---

## 2. Content fundamentals (voice & copy)

**Vibe:** professional, concise, growth-minded, quietly confident. Reads like a strong résumé
written by a builder, not a marketer. Technical fluency is shown, not boasted.

**Person & tense**
- **First person** in the About section ("I specialize in…", "I've also spent…").
- **Third-person / imperative bullets** elsewhere — experience responsibilities lead with strong
  past/present verbs: **Manage**, **Oversee**, **Supervised**, **Coordinated**, **Lead**.

**Casing**
- **Title Case** for section titles and card headings ("About Me", "Cash Back Optimizer").
- Sentence case for body copy and bullets.
- Tech names keep their canonical casing — `FastAPI`, `Next.js`, `PyTorch`, `LangChain`,
  `MongoDB`. (One stylistic exception in source: `NEXT.JS` appears uppercased on one tag.)

**Bilingual identity (do not drop)**
- The Arabic name **خالد آل دوســـــري** always appears above the Latin **Khalid Al Dosari**.
- Arabic is set in the Thmanyah display serif with full ligature/stylistic-set features on.

**Emphasis**
- Inline `<b>` bolding highlights key terms inside paragraphs — *agentic*, *machine learning*,
  *artificial intelligence*, the tech stack of each project. Used liberally but purposefully.

**Tone examples (verbatim from the site)**
- Hero tagline: *"CS Student | Data Scientist | AI Engineer"* (pipe-separated roles).
- About: *"I design scalable, production-ready solutions that turn raw data into actionable
  insights and real-world impact."*
- Experience bullet: *"Supervised teams in critical and prestigious events and conferences for
  multiple government and private entities."*

**Conventions**
- No emoji anywhere in product copy.
- Pipe `|` separates roles in taglines; bullets (`•` via `<ul>`) for responsibilities.
- Dates written long-form: *"August 2022 - present"*, *"October 2024 - November 2025"*.
- Contact details (email, phone, LinkedIn, GitHub, CV) are **identical** across hero, sidebar,
  and footer — keep them in sync.

---

## 3. Visual foundations

### Color
- **Background:** near-black `#0a0a0f`, with a secondary `#111118`. Everything lives on dark.
- **Accent:** a **cyan → blue gradient** (`#4fc3f7 → #0288d1`, 135°). Used sparingly for CTAs,
  links, underlines, tag text, glows, the logo ring. Never as large fills.
- **Text:** off-white `#e8e8ed` primary, cool grey `#9999a8` muted. No pure white, no pure black text.
- **Ambient field:** a fixed, heavily-blurred (`blur(40px)`) layer of radial glows behind
  everything — cyan top-left, blue top-right, violet bottom, cyan bottom-right. This is the light
  the glass refracts. **Without it the glass looks flat — never remove it.**

### Typography
- **Body:** Inter. **Headings / UI / buttons:** IBM Plex Sans. **Mono / tags / code:** JetBrains Mono.
- **Brand / Arabic display:** Thmanyah Serif Display (+ Serif Text, Sans). Editorial serif with
  rich OpenType ligatures and stylistic sets — used for the Arabic name and any signature moments.
- Section titles: IBM Plex Sans, 2rem, 700, centered, with a 50px gradient underline (`::after`).
- Hero name: 2.5rem, 700, tight tracking (`-0.5px`).

### The liquid-glass material
Every surface (cards, nav-when-scrolled, buttons-outline, tags, mobile drawer) composes from:
- `background: --glass-bg` — a faint 8%→2% white diagonal gradient.
- `backdrop-filter: blur(24px) saturate(180%)` (strong variant: 32px / 200%).
- `border: 1px solid rgba(255,255,255,0.12)` — a bright hairline.
- `--glass-highlight` — layered inset shadows: a bright top inset edge + dark bottom inset edge,
  simulating a lit glass bevel.
- `--glass-shadow` — `0 12px 40px rgba(0,0,0,0.35)` drop shadow for float.

### Backgrounds
- No imagery as background. No repeating patterns or textures. The "texture" is entirely the
  ambient radial glow + glass refraction.
- `.section-alt` bands add an almost-invisible (1.8% white) vertical gradient to separate
  alternating sections.

### Corners, borders, elevation
- Default radius **16px** (cards, drawer panels). Buttons **8px**. Tags/pills **20px** (fully round).
- Borders are always **translucent white hairlines**, never solid colored borders.
- Elevation = drop shadow + inset bevel highlights, *not* flat material elevation. Hover deepens
  the shadow and adds a faint cyan glow (`0 0 40px rgba(79,195,247,0.1)`).

### Motion
- **Default transition:** `0.3s ease` on `all` for interactive elements.
- **Hover lift:** `translateY(-2px)` (cards), `-4px` (project cards), `-1px` (small chips).
- **Scroll reveals:** AOS `fade-up`, `duration 700`, `easing 'ease-out'`, `once: true`, staggered
  `data-aos-delay` in 100ms increments down a section.
- **Mobile drawer:** slides in from the right with `cubic-bezier(0.16, 1, 0.3, 1)` over 0.4s; the
  page behind blurs (`blur(12px)`) and dims (`brightness(0.4)`, opacity 0.25).
- No bounce, no spring, no parallax. Calm and premium.

### Hover / press states
- **Links:** color shifts `--accent` → `--accent-dark`; nav links grow an underline left-to-right.
- **Cards:** brighten glass (`--glass-bg-hover`), lift, stronger shadow + cyan glow.
- **Primary button:** lift `-2px`, brighter inner highlight + larger cyan glow. Text stays black.
- **Skill tags:** fill with faint cyan, border turns cyan, text turns cyan, lift `-1px`.
- No explicit "press/active" shrink — the system relies on hover affordances.

### Transparency & blur — when
- Blur is used on any surface that should read as glass: cards, the scrolled navbar, outline
  buttons, tags, the mobile drawer + its backdrop overlay.
- The top of the navbar uses a `mask-image` fade so it dissolves into the page rather than ending
  in a hard line.
- Imagery (portrait, logos) is **opaque** — glass is for chrome/containers, not photos.

### Imagery vibe
- The hero portrait is a clean, neutral-grey studio headshot — cool, crisp, professional.
- Logos are small (48–72px), `object-fit: contain`, on their own backgrounds, with `onerror`
  fallbacks that hide broken images.
- The portrait sits in a 380px circle with a glass bevel ring + cyan outer glow.

---

## 4. Iconography

- **Primary icon set:** **Font Awesome 6.5.1** (loaded from cdnjs), solid (`fas`) + brand (`fab`)
  styles. Used for: nav item glyphs (`fa-user`, `fa-graduation-cap`, `fa-folder-open`,
  `fa-briefcase`, `fa-award`, `fa-laptop-code`, `fa-language`), contact row
  (`fa-envelope`, `fa-phone`, `fab fa-linkedin`, `fab fa-github`), meta accents
  (`fa-calendar-alt`, `fa-external-link-alt`, `fa-file-pdf`).
- **One bespoke inline SVG:** the **CV / résumé icon** (a document with a person + lines), drawn
  inline with `stroke="currentColor"`, `stroke-width="2.2"`, round caps/joins — matching the
  Font Awesome stroke feel. Reused in hero, sidebar, and footer contact rows. Saved here as
  `assets/icon-cv.svg`.
- **No emoji. No unicode-glyph icons.** Icons are always Font Awesome or the single CV SVG.
- Icons are small (1.1–1.3rem), inherit `currentColor` (muted grey at rest, cyan/black on hover),
  and never carry their own background except in the mobile sidebar social row (where they sit in
  38px circular glass buttons).

**Recreating the system:** load Font Awesome 6.5.1 from CDN (kit components do this), and use
`assets/icon-cv.svg` for résumé links. Do not substitute another icon library — the FA solid/brand
mix is part of the look.

---

## 5. Index / manifest

Root files:
- **`README.md`** — this file. Product context, voice, visual foundations, iconography, manifest.
- **`colors_and_type.css`** — the full token set: `@font-face` (local Thmanyah), color + glass +
  type + spacing + shape CSS variables, and semantic type classes (`.ds-h1`, `.ds-body`, …).
- **`SKILL.md`** — Agent-Skill front-matter wrapper so this system can be used in Claude Code.

Folders:
- **`fonts/`** — Thmanyah `.otf` files (Sans, Serif Text, Serif Display × Light/Regular/Medium/Bold/Black).
- **`assets/`** — `logo.png` (KA brand mark), `favicon.ico`, `photo.jpg` (hero portrait),
  `icon-cv.svg`, and `logos/` (university, employers, certification issuers).
- **`preview/`** — small HTML cards rendered in the Design System tab (color, type, glass,
  spacing, component specimens).
- **`ui_kits/portfolio/`** — the faithful, interactive recreation of the portfolio website:
  `index.html` + JSX components (`Navbar`, `Hero`, `GlassCard`, `ProjectCard`, `Timeline`,
  `Tag`, `Button`, `SkillGroup`, `CertCard`, `Footer`, `MobileDrawer`). See its own README.

---

## 6. Hard rules (keep on-brand)
1. Dark only. Near-black background, off-white text. Never light-mode.
2. Surfaces are translucent **glass** (blur + hairline + inset bevel), never flat opaque blocks.
3. Accent is the **cyan→blue gradient**, used sparingly — CTAs, links, underlines, glows.
4. Keep the **ambient glow field** behind everything; glass needs it to refract.
5. Bilingual identity: Arabic name in Thmanyah display serif above the Latin name.
6. Icons = Font Awesome 6.5.1 + the one CV SVG. No emoji, no unicode icons.
7. Generous spacing, centered section titles, 16px radius, subtle `translateY` hover lifts.
8. Two distinct tag classes: project chips `.tag` (mono, cyan), skill chips `.skill-tag` (glass pill).
