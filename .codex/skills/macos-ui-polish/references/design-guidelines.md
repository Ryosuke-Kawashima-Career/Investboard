# Dia Browser & macOS UI Design Guidelines (Light Theme Primary)

Detailed design rules, architectural patterns, and material specifications for engineering professional Dia Browser and light-mode macOS user interfaces across web and desktop applications.

---

## 1. Functional Purity Rule (Mandatory)

- **Zero Unused Components**: Every component rendered on screen must have working functionality connected to application state or event handlers.
- **No Faux OS Chrome**: Never create decorative macOS window traffic lights (red, yellow, green circles), dummy titlebars, unhooked search bars, or decorative keyboard shortcut badges.
- **Style Only What Works**: Apply the patterns below strictly to existing, functional UI controls. If a control is non-functional, delete it rather than polishing it.

---

## 2. Material Layers & Framed Canvas Architecture (Light Mode)

| Element | Background | Blur Filter | Border / Highlight |
| :--- | :--- | :--- | :--- |
| **App Outer Shell** | `#f2f2f5` | None | Wraps the inset canvas with `6px–10px` padding |
| **Framed Canvas Viewport** | `#ffffff` or `#f5f5f7` | None (optional 24px subtle dot grid) | `1px solid rgba(0, 0, 0, 0.07)`, `border-radius: 14px`, subtle elevation |
| **Floating Dock / Toolbar** | `rgba(255, 255, 255, 0.78)` | `blur(28px) saturate(180%)` | `1px solid rgba(0, 0, 0, 0.08)` + inner top specular glow |
| **Sidebars & Panels** | `rgba(246, 246, 248, 0.82)` | `blur(24px) saturate(180%)` | Hairline divider `rgba(0, 0, 0, 0.06)` |
| **Modal Sheets** | `rgba(255, 255, 255, 0.88)` | `blur(36px) saturate(190%)` | `1px solid rgba(0, 0, 0, 0.10)` + diffuse modal shadow |
| **Card Containers** | `rgba(255, 255, 255, 0.92)` | `blur(16px)` | `1px solid rgba(0, 0, 0, 0.06)` + inner highlight |

---

## 3. Interactive Control Styles (Dia Standard)

### Optical Corner Nesting (`R_outer = R_inner + padding`)
- Always calculate border radii concentrically so nested elements share uniform optical curvature:
  - Example: A segmented track with `padding: 4px` and inner buttons with `border-radius: 8px` must use `border-radius: 12px` on the outer container.

### Segmented Controls & Tabs (Elevated White Pill)
- **Track container**: `background: rgba(0, 0, 0, 0.04)`, `padding: 3px`, `border-radius: 11px` (or `9999px` for capsule docks).
- **Default item state**: Transparent background with muted slate text (`rgba(60, 60, 67, 0.72)`).
- **Hover item state**: Soft neutral tint (`rgba(0, 0, 0, 0.04)`) and primary text (`#1d1d1f`).
- **Active / Selected item state**: Crisp elevated white pill (`#ffffff`), primary text (`#1d1d1f`), and multi-layer micro-shadow (`0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.06)`).
- **Primary CTA button**: Reserve solid macOS Accent Blue (`#007aff`) with white text for primary action buttons.
- **Press state**: Tactile micro-scale `scale(0.97)`.

### Functional Command / Composer Bar
- Apply only to active search, prompt, or command inputs:
  - Surface: `#ffffff` or `rgba(255, 255, 255, 0.92)` with `backdrop-filter: blur(24px)`.
  - Resting border & shadow: `0 4px 20px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.08)`.
  - Focused state: Smoothly transitions to a soft ambient focus ring (`0 8px 28px rgba(0, 122, 255, 0.12), 0 0 0 1.5px rgba(0, 122, 255, 0.45)`).
- **Keyboard Shortcut Keycaps (`.macos-kbd`)**:
  - Render **only** when a real keyboard listener is bound to that action.
  - Styled with `font-size: 11px`, `padding: 2px 5px`, `border-radius: 5px`, `background: rgba(0, 0, 0, 0.04)`, `border: 1px solid rgba(0, 0, 0, 0.08)`.

---

## 4. Typography, Iconography & Numeric Discipline
- **Primary text**: `#1d1d1f` (SF Pro / Inter, high readability).
- **Secondary text**: `rgba(60, 60, 67, 0.72)`.
- **Tertiary text**: `rgba(60, 60, 67, 0.45)`.
- **Letter spacing**:
  - Headings: `-0.02em`
  - UI controls & labels (`12px–14px`): `-0.01em`
- **Tabular numerals**: Always apply `font-variant-numeric: tabular-nums` to counters, timers, dimensions, and live statistics so layout width never jitters.
- **Icons**: Match icon stroke weight (`1.5px–1.75px`) to adjacent font weight (`500`) inside consistent `16px` or `18px` bounding boxes.
