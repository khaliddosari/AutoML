---
name: liquid-glass-design
description: Use this skill to generate well-branded interfaces and assets for Liquid Glass — the Khalid Al Dosari portfolio brand (dark, frosted "liquid glass" surfaces over an ambient cyan/blue glow). Use for production code or throwaway prototypes/mocks. Contains design guidelines, color & glass tokens, type, Thmanyah brand fonts, logos/assets, and a full UI-kit recreation of the portfolio.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

Key files:
- `README.md` — product context, content voice, visual foundations, iconography, manifest, hard rules.
- `colors_and_type.css` — import this to inherit every token: color, liquid-glass material, type
  families, spacing, radii, plus `@font-face` for the local Thmanyah fonts and semantic type classes.
- `fonts/` — Thmanyah `.otf` (Sans, Serif Text, Serif Display).
- `assets/` — `logo.png` (KA mark), `photo.jpg`, `favicon.ico`, `icon-cv.svg`, `logos/` (orgs/issuers).
- `preview/` — small specimen cards for color, type, glass, spacing, components.
- `ui_kits/portfolio/` — the interactive recreation of the site (React + the source CSS). Reuse
  `portfolio.css` + the JSX components, or read them to copy exact component markup.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets you need out and
produce static HTML files for the user to view — always link `colors_and_type.css`, keep the dark
background + ambient glow field, and compose surfaces from the glass tokens. If working on
production code, copy assets and follow the rules here to design as an expert in this brand.

If the user invokes this skill without other guidance, ask what they want to build or design, ask a
few focused questions, then act as an expert designer who outputs HTML artifacts or production code
depending on the need. Stay on-brand: dark only, translucent glass surfaces, cyan→blue accent used
sparingly, Font Awesome + the CV SVG for icons, bilingual identity preserved, no emoji.
