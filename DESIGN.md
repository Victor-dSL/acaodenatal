---
name: Natal de Esperança
colors:
  surface: '#fdf9f3'
  surface-dim: '#dddad4'
  surface-bright: '#fdf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ed'
  surface-container: '#f1ede7'
  surface-container-high: '#ebe8e2'
  surface-container-highest: '#e6e2dc'
  on-surface: '#1c1c18'
  on-surface-variant: '#574142'
  inverse-surface: '#31302d'
  inverse-on-surface: '#f4f0ea'
  outline: '#8b7171'
  outline-variant: '#debfbf'
  surface-tint: '#a93441'
  primary: '#6b0119'
  on-primary: '#ffffff'
  primary-container: '#8b1e2d'
  on-primary-container: '#ff9da0'
  inverse-primary: '#ffb3b4'
  secondary: '#406653'
  on-secondary: '#ffffff'
  secondary-container: '#bfe9d1'
  on-secondary-container: '#446b57'
  tertiary: '#472d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#644200'
  on-tertiary-container: '#e2af64'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b4'
  on-primary-fixed: '#40000b'
  on-primary-fixed-variant: '#881c2b'
  secondary-fixed: '#c2ecd3'
  secondary-fixed-dim: '#a6d0b8'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#284e3c'
  tertiary-fixed: '#ffddb1'
  tertiary-fixed-dim: '#f2be71'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#614000'
  background: '#fdf9f3'
  on-background: '#1c1c18'
  surface-variant: '#e6e2dc'
typography:
  headline-xl:
    fontFamily: Epilogue
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-xl-mobile:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Epilogue
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
  headline-md:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Epilogue
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system expresses a warm, reverent, and deeply human festive identity built for community action and charitable giving. It bridges traditional Christmas sentiment—hope, generosity, community, and quiet warmth—with contemporary digital efficiency.

### Aesthetics & Tone
- **Warm Festive Elegance with Soft Glass:** Subtle frosted glass surfaces, gentle inner glows, and radiant highlights that evoke candlelight on cold evenings without leaning into gaudy or commercial tropes.
- **Dignified Compassion:** Avoids cheap charity tropes; prioritizes dignity, clarity of purpose, and immediate emotional connection.
- **Frictionless Generosity:** Optimized for seamless digital giving (instant PIX copy-and-paste, dynamic target progress, tier selection) without feeling transactional.

### Target Audience & Emotional Impact
- Receptive to families, church congregations, and local community donors seeking transparent, heartwarming ways to impact underprivileged homes during the holidays.
- Evokes feelings of belonging, serenity, gratitude, and moral conviction.

## Colors

The color palette captures an organic, heirloom holiday mood centered around deep crimson, muted pine boughs, burnished golden candlelight, and gentle ivory parchment.

### Palette Architecture
- **Primary (`#8B1E2D` - Deep Crimson):** The primary emotional anchor. Used for primary calls-to-action, urgent appeal highlights, key metrics, and brand headers.
- **Secondary (`#244A38` - Pine Balsam):** Conveys stability, natural evergreen life, and communal endurance. Applied to reassurance elements, badges, progress track fills, and secondary buttons.
- **Tertiary (`#D4A359` - Candlelight Gold):** Subtle metallic warmth. Reserved for celebratory markers, stars, active PIX copy feedback, impact icons, and glow accents.
- **Neutral (`#FAF6F0` - Soft Ivory Cream):** The primary canvas surface. Replaces stark clinical white with the warmth of handmade cotton paper and soft winter light.

### State & Contrast Rules
- Text on crimson backgrounds strictly takes `#FAF6F0` for AA-compliant contrast.
- PIX donation cards utilize a dark slate-pine backdrop (`#1B382A`) or soft crimson glow container to elevate contrast during the checkout ritual.

## Typography

The typographic pairing pairs the expressive character of **Epilogue** with the modern legibility of **Plus Jakarta Sans**.

### Roles & Pairings
- **Headlines (Epilogue):** Balances geometric clarity with subtle humanist warmth and editorial presence. It gives campaign calls and impact statements an inviting, celebratory weight without becoming whimsical or hard to scan.
- **Body & Labels (Plus Jakarta Sans):** Delivers clean readability for storytelling, theological reflections, donation instructions, and PIX keys. Its soft contours complement the rounded card surfaces.

### Formatting Guidelines
- Maintain generous line-heights across body text to preserve a calm, unhurried reading experience.
- Currency and numeric amounts in donation modules use `Epilogue` semibold for clear visual impact.

## Layout & Spacing

The layout is built around a responsive 12-column grid on desktop, scaling to a 4-column flow on mobile viewports.

### Grid & Density Rules
- **Desktop (min-width: 1024px):** 12 columns, max-width `1200px` centered canvas, `margin-desktop` of `3rem`, and `gutter-desktop` of `2rem`.
- **Tablet (640px to 1023px):** 8 columns with dynamic gutters of `1.5rem`.
- **Mobile (< 640px):** 4 columns with `margin` of `1rem`. Critical interaction cards (e.g., PIX quick-give, total baskets raised) span all 4 columns for maximum tap comfort.

### Component Spacing Rhythm
- Compact controls and chip groups utilize `space-sm` (0.5rem) gaps.
- Card interiors and donation tier selectors leverage `space-lg` (1.5rem) padding to maintain an airy, thoughtful rhythm.
- Section vertical separation relies on `space-xl` (2.5rem) scaled up to 4rem on wide screens.

## Elevation & Depth

Visual depth is achieved through layered frosted glass (subtle glassmorphism) paired with warm candlelight ambient diffusion rather than harsh drop shadows.

### Elevation Levels
- **Level 0 (Flat / Canvas):** Neutral ivory (`#FAF6F0`) or subdued evergreen deep background (`#152C21`) with no shadow.
- **Level 1 (Subtle Glass Surface):** Semi-opaque background (`rgba(255, 255, 255, 0.72)` on light mode, `rgba(36, 74, 56, 0.45)` on dark containers), 12px backdrop blur, 1px perimeter highlight (`rgba(212, 163, 89, 0.25)` or `rgba(255, 255, 255, 0.4)`), and a soft diffused drop shadow: `0 8px 24px rgba(36, 74, 56, 0.08)`.
- **Level 2 (Featured Donation / Active Popover):** Raised glass card with `0 16px 36px rgba(139, 30, 45, 0.12)`, enhanced backdrop blur (16px), and a warm amber-rim ambient border: `1px solid rgba(212, 163, 89, 0.4)`.
- **Candlelight Glow:** Key interactive elements (such as the primary PIX action button) feature an ambient radial glow (`0 0 20px rgba(212, 163, 89, 0.35)`) to guide focus intuitively.

## Shapes

The design system incorporates **Rounded** geometry (`roundedness: 2`), reflecting gentleness, approachability, and warmth.

### Corner Radii Guidelines
- **Base Components (0.5rem / 8px):** Form fields, list items, small chips, and utility badges.
- **Large Components (1rem / 16px):** Donation cards, PIX container modules, interactive calculators, and modal overlays.
- **Extra Large Containers (1.5rem / 24px):** Campaign hero banners, featured testimonial enclosures, and basket progress overviews.
- **Pill (Fully Rounded):** Fixed call-to-action buttons, quick-amount select pills (e.g., "R$ 30", "R$ 60", "Cesta Completa"), and status pills.

## Components

### Buttons
- **Primary (Donation / Action):** Deep crimson (`#8B1E2D`) pill with soft white text (`#FAF6F0`), high-contrast tap targets (minimum 48px height), and a gentle warm-glow hover state.
- **Secondary:** Transparent fill with a 1.5px border in Pine Balsam (`#244A38`), transitioning to a soft pine tint on hover.
- **Tertiary / Festive Accent:** Burnished Gold (`#D4A359`) fill with dark pine text (`#152C21`) for secondary milestones or celebratory moments.

### Chips & Quick-Amount Selectors
- Pill-shaped radio chips for selecting pre-defined amounts (e.g., `R$ 25`, `R$ 50`, `R$ 120`).
- Unselected state: Frosted ivory glass with muted green text and a hairline border.
- Selected state: Deep crimson fill or pine fill with a subtle golden check indicator.

### PIX Donation Module
- **QR Code Enclosure:** High-contrast white background with rounded corners (`12px`), framed inside a warm frosted glass card.
- **PIX Key Copy Field:** Monospace/clear legible display of the church's PIX key with an immediate, high-visibility "Copiar Chave PIX" pill button that triggers an instantaneous golden success banner ("Chave Copiada!").
- **Real-Time Impact Indicator:** Sub-copy dynamically translating the selected amount (e.g., *"Com R$ 60 você garante 1 ceia de Natal para uma família"*).

### Cards & Glass Panels
- Built with Level 1 or Level 2 frosted glass aesthetics.
- Card borders feature faint warm-tinted highlights (`rgba(212, 163, 89, 0.3)`) resembling candle illumination along the edges.

### Progress & Goal Trackers
- Rounded bar container (`height: 12px` to `16px`) with a soft cream background.
- Active fill in vibrant pine green (`#244A38`) culminating in a glowing golden progress pin (`#D4A359`).
- Paired with typography declaring both the monetary benchmark and physical tangible units (e.g., *"340 de 500 cestas arrecadadas"*).

### Input Fields & Checkboxes
- **Inputs:** Soft ivory background with a 1px border in subdued pine; expands to an amber-gold border on `:focus` with a diffuse glow.
- **Checkboxes & Radios:** Rounded geometry with custom crimson fill and crisp ivory tick marks, ensuring unambiguous confirmation states.