---
name: Doxa Tours & Car Hire
version: 1.0
colors:
  # --- Primary Brand ---
  primary: '#0C5CF0'
  primary-container: '#043BA9'
  on-primary: '#ffffff'
  on-primary-container: '#ffffff'
  inverse-primary: '#ECEEEF'
  primary-fixed: '#E8EFFD'
  primary-fixed-dim: '#ECEEEF'
  on-primary-fixed: '#043BA9'
  on-primary-fixed-variant: '#0C5CF0'

  # --- Secondary / CTA Red ---
  secondary: '#C50000'
  secondary-container: '#E90809'
  on-secondary: '#ffffff'
  on-secondary-container: '#ffffff'
  secondary-fixed: '#FFEBEE'
  secondary-fixed-dim: '#FF3535'
  on-secondary-fixed: '#C50000'
  on-secondary-fixed-variant: '#E90809'

  # --- Tertiary / Deep Navy ---
  tertiary: '#1D2235'
  tertiary-container: '#1D2235'
  on-tertiary: '#ffffff'
  on-tertiary-container: '#8C929D'
  tertiary-fixed: '#E8EAED'
  tertiary-fixed-dim: '#8C929D'
  on-tertiary-fixed: '#1D2235'
  on-tertiary-fixed-variant: '#43474F'

  # --- Surface / Background ---
  surface: '#F6F8FB'
  background: '#F6F8FB'
  on-surface: '#1D2235'
  on-background: '#1D2235'
  surface-variant: '#ECEEEF'
  on-surface-variant: '#8C929D'
  surface-container: '#ECEEEF'
  surface-container-low: '#F8F9FC'
  surface-container-high: '#D7DCE5'
  surface-container-highest: '#D7DCE5'
  surface-container-lowest: '#ffffff'
  surface-dim: '#D7DCE5'
  surface-bright: '#ffffff'
  surface-tint: '#0C5CF0'

  # --- Structural ---
  outline: '#8C929D'
  outline-variant: '#D7DCE5'
  inverse-surface: '#1D2235'
  inverse-on-surface: '#F6F8FB'

  # --- Error / Danger ---
  error: '#E90809'
  on-error: '#ffffff'
  error-container: '#FFEBEE'
  on-error-container: '#C50000'

typography:
  h1:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h1-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  h2:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.3'
  h2-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.3'
  h3:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
  button:
    fontFamily: Montserrat
    fontWeight: '600'
    letterSpacing: '0.5px'
  number:
    fontFamily: Montserrat
    fontWeight: '700'
rounded:
  inputs: 10px
  buttons: 12px
  cards: 20px
  badges: 50px
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  xxl: 120px
  container-max: 1280px
  gutter: 32px
  grid-gap: 32px
  section: 120px
shadows:
  card: '0 15px 40px rgba(0,0,0,.12)'
  card-hover: '0 25px 60px rgba(0,0,0,.18)'
  button: '0 8px 20px rgba(12,92,240,.35)'
gradients:
  brand: 'linear-gradient(90deg, #043BA9 0%, #0C5CF0 45%, #FFFFFF 100%)'
  cta: 'linear-gradient(90deg, #E90809 0%, #FF3535 100%)'
  hero-overlay: 'linear-gradient(135deg, #1D2235 0%, #043BA9 100%)'
animations:
  cards: 'translateY(-8px)'
  buttons: 'scale(1.04)'
  navigation: 'smooth underline'
  images: 'zoom 1.05'
  sections: 'fade up'
---

## Brand Identity

**Style:** Modern · Premium · Automotive · Corporate · Professional · Fast · Clean · Minimal

**Brand Direction:** Premium • Modern • Automotive • Corporate • Trustworthy • Fast • Clean • **Blue & Red Identity**

The design system reflects a high-performance, high-trust car hire and tours brand. The visual language draws from premium automotive brands: bold blues communicate reliability and technology, while high-energy red drives urgency on CTAs and promotions.

---

## Color System

### Primary Blue — `#0C5CF0`
The dominant brand color. Used for primary buttons, active nav links, icons, highlights, and focus rings. It signals technology, trust, and speed.

### Dark Royal Blue — `#043BA9`
Structural authority. Used for hero overlays, navigation backgrounds, card headers, footer, and all major headings. The deeper shade grounds the premium aesthetic.

### Deep Navy — `#1D2235`
The darkest tone. Used for section backgrounds (hero, footer), dark cards, and body text on light backgrounds. Creates strong contrast and premium depth.

### Bright Red — `#E90809`
High-urgency action. Reserved strictly for CTAs, badges, hover accent lines, and promotions. Never used for passive UI elements — only for "act now" signals.

### Silver — `#8C929D`
Supporting tone. Borders, secondary icons, placeholder text, metadata.

### Light Silver — `#ECEEEF`
Subtle fill. Card backgrounds, input fields, light section fills, dividers.

---

## Gradients

| Name | CSS |
|------|-----|
| **Brand** | `linear-gradient(90deg, #043BA9 0%, #0C5CF0 45%, #FFFFFF 100%)` |
| **CTA** | `linear-gradient(90deg, #E90809 0%, #FF3535 100%)` |
| **Hero Overlay** | `linear-gradient(135deg, #1D2235 0%, #043BA9 100%)` |

---

## Typography

Two-font system optimised for automotive corporate identity:

**Montserrat** — headings, buttons, numbers. ExtraBold (800) for H1/H2, Bold (700) for H3, SemiBold (600) for buttons. Geometric confidence with a premium editorial presence.

**Inter** — body text (400/500). High screen legibility for data tables, descriptions, and form labels.

---

## Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `section` | 120px | Padding between page sections |
| `container-max` | 1280px | Max content width |
| `grid-gap` | 32px | Gap between cards/columns |
| `lg` | 32px | Card internal padding |
| `xl` | 64px | Sub-section spacing |
| `xxl` | 120px | Major section breaks |

---

## Shadows

| Context | Value |
|---------|-------|
| Cards | `0 15px 40px rgba(0,0,0,.12)` |
| Card Hover | `0 25px 60px rgba(0,0,0,.18)` |
| Buttons | `0 8px 20px rgba(12,92,240,.35)` |

---

## Border Radius

| Element | Radius |
|---------|--------|
| Cards | 20px |
| Buttons | 12px |
| Inputs | 10px |
| Badges | 50px |

---

## Buttons

| Type | Background | Text | Hover | Radius | Padding |
|------|-----------|------|-------|--------|---------|
| **Primary** | `#0C5CF0` | White | `#043BA9` | 12px | 16px 30px |
| **Secondary** | White | `#043BA9` | `#043BA9` / White text | 12px | 14px 28px |
| **CTA / Danger** | `#E90809` | White | `#C50000` | 12px | 16px 30px |

All buttons use **Montserrat SemiBold, 0.5px letter-spacing**.

---

## Navigation

| State | Color |
|-------|-------|
| Background | White |
| Active link | `#0C5CF0` |
| Inactive link | `#1D2235` |
| Hover | `#E90809` |
| Bottom border | 3px solid `#0C5CF0` |

---

## Status Tags / Badges

| Tag | Color |
|-----|-------|
| Available | `#0C5CF0` |
| Promotion | `#E90809` |
| Luxury | `#043BA9` |
| Popular | `#E90809` |
| Hired / Unavailable | `#8C929D` |

---

## Component Colors

| Component | Background | Text | Accent |
|-----------|-----------|------|--------|
| Navbar | White | Navy `#1D2235` | Blue `#0C5CF0` |
| Hero | Navy `#1D2235` | White | Red `#E90809` |
| Cards | White | Navy | Blue |
| CTA Banner | Red `#E90809` | White | — |
| Footer | Navy `#1D2235` | White | Blue |
| Forms | White | Navy | Blue focus |
| Badges | Red `#E90809` | White | — |
| Testimonials | Blue `#043BA9` | White | — |

---

## Section Backgrounds

| Section | Background |
|---------|-----------|
| Hero | `#1D2235` |
| About | `#FFFFFF` |
| Fleet / Cars | `#F6F8FB` |
| Services | `#FFFFFF` |
| Testimonials | `#043BA9` |
| Contact | `#F8F9FC` |
| Footer | `#1D2235` |

---

## Icons

| State | Color |
|-------|-------|
| Default | `#0C5CF0` |
| Hover | `#E90809` |
| Background circle | `#F6F8FB` |

---

## Forms

| Element | Value |
|---------|-------|
| Background | White |
| Border | `#D7DCE5` |
| Focus | `#0C5CF0` |
| Placeholder | `#8C929D` |
| Submit button | Primary Blue |

---

## Animations

| Element | Animation |
|---------|-----------|
| Cards | `translateY(-8px)` on hover |
| Buttons | `scale(1.04)` on hover |
| Navigation links | Smooth underline |
| Images | `zoom 1.05` on hover |
| Sections | Fade up on scroll |

---

## UI Style Principles

- **Glassmorphism (light)** — subtle frosted glass effects on overlaid cards
- **Premium spacing** — generous whitespace, 120px section padding
- **Rounded corners** — 20px cards, 12px buttons
- **Bold typography** — Montserrat 800 for all headings
- **Large hero** — full-viewport hero with navy/blue gradient overlay
- **High-quality vehicle photography** — central to every fleet section
- **Blue dominant** — primary brand color drives the entire visual system
- **Red call-to-actions** — red is reserved exclusively for action-driving elements
- **Minimal icons** — icon outlines only, never decorative

---

## Website Sections

1. Navigation
2. Hero
3. Trusted Partners
4. Featured Fleet
5. Vehicle Categories
6. Why Choose DOXA
7. Car Hire Process
8. Available Cars
9. Long-Term Leasing
10. Corporate Fleet Services
11. Car Tracking Solutions
12. Car Sound Systems
13. Tour Packages
14. Pricing
15. Customer Testimonials
16. FAQs
17. Contact
18. Google Map
19. Footer
