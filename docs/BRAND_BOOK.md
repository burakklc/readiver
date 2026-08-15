# Readiver Brand Book

## Brand idea

Readiver is clean, basic, editorial, premium, calm, intelligent, precise, and
typography-first. It should feel closer to a premium reading app, a refined
publishing product, or Apple Books than to a chatbot, generic SaaS dashboard,
typical AI product, gamified language app, or Duolingo clone.

## Core visual metaphor: the lens

The same content can be viewed through different levels of language complexity.
This lens metaphor should inform hierarchy, the level selector, and gentle focus
transitions. It is conceptual, not a reason to repeat literal camera-lens
graphics.

## Color

### Light

| Token | Value | Role |
| --- | --- | --- |
| Paper | `#F6F2EA` | Primary background |
| Paper Light | `#FCFAF6` | Quiet raised surface |
| Ink | `#171714` | Primary text |
| Ink Soft | `#3A3834` | Secondary strong text |
| Stone | `#77736B` | Muted text |
| Line | `#DED8CE` | Dividers and borders |
| Accent Blue | `#2451D1` | Primary action and active level |
| Accent Blue Soft | `#EAF0FF` | Subtle accent surface |
| Success | `#2E7D5B` | Positive status |
| Warning | `#C6862B` | Caution status |
| Error | `#B5483F` | Destructive and error status |

### Dark

| Token | Value | Role |
| --- | --- | --- |
| Night Paper | `#171714` | Primary background |
| Night Surface | `#1F1D1A` | Standard surface |
| Night Elevated | `#26231F` | Raised surface |
| Night Text | `#F4F0E8` | Primary text |
| Night Secondary | `#B4AEA3` | Secondary text |
| Night Border | `#3A3631` | Dividers and borders |
| Night Accent Blue | `#4C75F0` | Primary action and active level |
| Night Accent Soft | `#24335E` | Subtle accent surface |

Use cobalt sparingly so it retains meaning. Status colors are semantic, not
decoration. CEFR levels do not receive rainbow-coded identities.

## Typography

Use an editorial serif for large titles and a clean native sans-serif for body
copy and interface controls. On Apple platforms, follow a New York-style serif
direction for display and SF Pro for interface and body. On the web, start with
high-quality system fallbacks. Do not add proprietary font dependencies without
a demonstrated need.

Favor readable measure, generous line height, clear hierarchy, and large
whitespace over decorative UI.

## Visual rules

Prefer warm paper-like backgrounds, strong typography, large whitespace, subtle
borders, restrained cobalt blue, elegant hierarchy, and editorial layouts.

Avoid purple AI gradients, neon, glassmorphism, excessive shadows, AI sparkles,
robot imagery, chatbot bubbles, excessive card grids, cartoon mascots, rainbow
CEFR colors, and generic edtech visuals.

## Signature component: Level Lens

The future Level Lens presents a single continuous scale:

```text
A1 — A2 — B1 — B2 — C1 — C2
```

The active level uses Accent Blue; inactive levels use Ink Soft or Stone. It
should read as one focused control rather than six unrelated buttons. A future
transition should feel like gently changing focus: brief, restrained changes in
sharpness, position, or emphasis, with reduced-motion support. Do not imply that
levels are scores or rewards. The final interaction is intentionally not part of
the foundation shell.
