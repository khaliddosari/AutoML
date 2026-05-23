---
name: Kinetic Academy
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#484554'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#797585'
  outline-variant: '#cac4d6'
  surface-tint: '#6543cd'
  primary: '#38009d'
  on-primary: '#ffffff'
  primary-container: '#4f29b7'
  on-primary-container: '#bfadff'
  inverse-primary: '#ccbdff'
  secondary: '#725c00'
  on-secondary: '#ffffff'
  secondary-container: '#feda5f'
  on-secondary-container: '#755f00'
  tertiary: '#582200'
  on-tertiary: '#ffffff'
  tertiary-container: '#7c3300'
  on-tertiary-container: '#ffa170'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e7deff'
  primary-fixed-dim: '#ccbdff'
  on-primary-fixed: '#1f0060'
  on-primary-fixed-variant: '#4d26b5'
  secondary-fixed: '#ffe07e'
  secondary-fixed-dim: '#e6c44b'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#564500'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783100'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
  success-green: '#80d882'
  info-blue: '#4c96fe'
  error-pink: '#ff8081'
  warning-orange: '#f4a664'
  surface-purple-tint: '#e7ddff'
  surface-green-tint: '#d3f5d5'
typography:
  headline-xl:
    fontFamily: IBM Plex Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  section-gap: 80px
---

## Brand & Style

The design system is engineered for a tech-forward educational environment that balances professional rigor with energetic momentum. It is designed to feel ambitious, modern, and highly structured, mirroring the precision of coding and digital craftsmanship. 

The aesthetic blends **Modern Corporate** reliability with **High-Contrast Bold** accents. It utilizes a predominantly light, airy canvas to ensure that the vibrant secondary palette is used with surgical precision-highlighting achievements, paths, and calls to action. The visual language is punctuated by geometric discipline, using grid-based patterns and clean lines to evoke a sense of digital architecture.

## Colors

This design system utilizes a high-energy "Vibrant Tech" palette. The primary Purple serves as the anchor, used for headers, primary actions, and brand identification. 

The secondary palette (Yellow, Green, Blue, Pink, Orange) is functional rather than purely decorative. These colors should be used as "Signals"-Yellow for featured paths, Green for completion/success, and Blue for interactive depth. Surfaces primarily use white (#FFFFFF) and a cool neutral (#F5F5F7) to maintain clarity, while very soft tints of the primary and functional colors (e.g., `#E7DDFF`) are used to create distinct content zones without overwhelming the user.

## Typography

IBM Plex Sans is the sole typographic voice, chosen for its industrial yet humanistic character. It bridges the gap between the technical world of development and the accessibility of modern education. 

Headlines use heavy weights and tight letter-spacing to create a sense of authority and impact. Labels are frequently set in uppercase with increased tracking to provide clear "metadata" indicators for course levels or dates. Body text maintains generous line heights to ensure long-form educational content remains highly readable.

## Layout & Spacing

The system follows a **Fixed Grid** philosophy for primary content, centering the layout at 1280px on desktop to maintain focus. A 12-column system is used with 24px gutters.

The spacing rhythm is based on an 8px baseline. Section-to-section transitions require significant whitespace (80px+) to distinguish between different learning modules or informational blocks. On mobile, margins tighten to 16px, and complex grids collapse into a single-column stack, prioritizing the vertical flow of information.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Low-Contrast Outlines**. 

Instead of traditional heavy shadows, the system uses subtle "ghost borders" (1px solid borders using a 10% opacity version of the primary color) to define containers. Depth is signaled by shifting surface colors-from pure White to the Neutral Grey (#F5F5F7). 

In specific "featured" instances, a very soft, diffused ambient shadow with a hint of the primary purple tint is used to lift primary cards off the page, making them feel interactive and "hoverable."

## Shapes

The shape language is consistently **Rounded**, using a 0.5rem (8px) base radius. This softens the technical aesthetic, making the academy feel welcoming. 

Large containers and cards utilize the `rounded-xl` (1.5rem / 24px) setting to create "friendly capsules" for content. Interactive elements like buttons and chips maintain the standard `rounded` (0.5rem) or `pill-shaped` geometry to clearly distinguish them as touchpoints.

## Components

### Buttons
Primary buttons are solid Purple (#4f29b7) with white text, using a `rounded` corner. Secondary buttons use a subtle Purple outline. High-impact CTAs may occasionally use the vibrant Yellow with dark text to draw immediate attention.

### Cards
Cards are the primary content vehicle. They should have a white background, 1px light grey border, and 24px internal padding. Category-specific cards may feature a 4px top-border in one of the functional colors (Green, Blue, Pink) to indicate the course track.

### Chips & Tags
Used for course metadata (e.g., "Beginner," "Enrolling Now"). These use the "Surface Tints" (like `#E7DDFF`) as backgrounds with darkened versions of the same hue for the text.

### Input Fields
Inputs are clean with a 1px border that transitions to the primary Purple on focus. Labels sit directly above the field using the `label-md` typographic style.

### Progress Indicators
Linear bars use the functional Green (#80d882) against a light grey track to provide high-visibility feedback on user progression.