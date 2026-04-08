# Design System Specification: The Cognitive Atelier

## 1. Overview & Creative North Star
The "Cognitive Atelier" is the creative north star for this design system. We are moving away from the "SaaS dashboard" aesthetic and toward a high-end, editorial learning environment. The platform must feel like a quiet, premium studio—an "Atelier"—where AI is not a flashy gimmick, but a sophisticated, luminous presence.

To achieve this, we leverage **Intentional Asymmetry** and **Tonal Depth**. We avoid rigid, boxed grids in favor of "floating" content clusters and expansive white space. This immersion-first approach ensures the student’s focus is never on the UI, but on the knowledge itself.

---

## 2. Color & Atmospheric Tones
We use a sophisticated Material 3-based palette to define presence and purpose. 

### Core Palette
- **Primary (`#004AC6`):** Intellectual authority. Used for high-level progression and primary actions.
- **Secondary (`#515F74`):** The "Supporting Voice." Reserved for metadata, inactive states, and secondary navigation.
- **Tertiary/AI Accent (`#632ECD`):** The "Luminous Mind." This purple accent is exclusive to AI tutor interfaces, generating a distinct psychological shift when the user engages with intelligence.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. 
- Boundaries must be defined solely through background shifts. 
- Use `surface-container-low` for large content areas sitting on a `surface` background.
- Use `surface-container-highest` only for the most critical interactive focus points.

### The "Glass & Gradient" Rule
To elevate the AI features, use **Glassmorphism**. AI-specific panels should use a semi-transparent `tertiary-container` with a `backdrop-filter: blur(20px)`. Main CTAs should not be flat; apply a subtle linear gradient from `primary` to `primary-container` at a 135-degree angle to provide "visual soul."

---

## 3. Typography: Editorial Authority
The type system pairs **Manrope** (Display/Headlines) with **Plus Jakarta Sans** (UI/Body) to create a balance between modern geometry and readable warmth.

- **Display (Large/Medium/Small):** `manrope` | 3.5rem to 2.25rem. Use for chapter headings and major milestones. Bold weight.
- **Headline (Large/Medium/Small):** `manrope` | 2rem to 1.5rem. SemiBold. These define the "editorial" feel of the lessons.
- **Title (Large/Medium/Small):** `plusJakartaSans` | 1.375rem to 1rem. Medium weight. Used for card headers and navigation labels.
- **Body (Large/Medium/Small):** `plusJakartaSans` | 1rem to 0.75rem. Regular weight. Optimized for long-form learning content.
- **Code/Technical:** `JetBrains Mono` | 0.875rem. Exclusive to the Editor background (`Gray 900`).

---

## 4. Elevation & Depth: Tonal Layering
We reject traditional drop shadows in favor of **Tonal Layering**. Depth is a physical stack of surfaces.

- **The Layering Principle:** 
    - Base Level: `surface`
    - Section Level: `surface-container-low`
    - Card/Component Level: `surface-container-lowest` (pure white)
- **Ambient Shadows:** When an element must float (e.g., a modal or an active AI bubble), use a "tinted" shadow. Instead of `#000000`, use a 6% opacity shadow using the `on-surface` color with a 40px blur and 20px spread.
- **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components & Interaction Patterns

### Buttons (The Core Drivers)
- **Primary:** Gradient fill (`primary` to `primary-container`), `8px` (0.5rem) radius. Subtle inner-glow on hover.
- **Secondary:** `surface-container-high` fill with `on-secondary-container` text. No border.
- **AI Action:** `tertiary-container` with a glass effect. Use this exclusively for "Ask AI" or "Explain this."

### Cards & Learning Modules
**Strict Rule:** No dividers. Separate content using the Spacing Scale (e.g., `2rem` vertical gaps) or subtle shifts from `surface-container-low` to `surface-container-lowest`. 
- **Roundedness:** Use `xl` (1.5rem) for main dashboard cards and `md` (0.75rem) for inner nested elements.

### The AI Tutor Bubble
Floating elements that use the `tertiary` token. These should have a "luminous" quality—apply a `shadow` that matches the `tertiary` hue at 10% opacity to make the AI feel like it is emitting light.

### Input Fields
Soft, oversized inputs using `surface-container-highest` background. The active state should not use a thick border, but rather a `2px` glow using the `primary` color at 20% opacity.

---

## 6. Do's and Don'ts

### Do
- **Do** use intentional white space. If a layout feels "full," remove a container and use a background color shift instead.
- **Do** use `JetBrains Mono` for all technical data, not just code blocks.
- **Do** treat the `Gray 900` Editor BG as a "dark room" experience—ensure high contrast with `primary-fixed` tokens.

### Don't
- **Don't** use 1px black or grey borders. They break the editorial immersion.
- **Don't** use the Purple `tertiary` color for non-AI elements. It must remain a "cognitive trigger" for AI interaction.
- **Don't** use standard "Material Blue" for icons. Use the `secondary` (`slate`) palette to keep the UI quiet and professional.

### Accessibility Note
Ensure all text on `surface-container` tiers meets WCAG AA standards. When using Glassmorphism, ensure the `backdrop-filter` is paired with a fallback solid color for browsers that do not support transparency effects.