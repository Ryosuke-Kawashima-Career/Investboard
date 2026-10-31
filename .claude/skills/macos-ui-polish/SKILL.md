---
name: macos-ui-polish
description: >-
  Audits, refactors, and polishes web and desktop application user interfaces with macOS Light Theme liquid acrylic glassmorphism, floating pill toolbars, and tactile micro-interactions in English.
---

# macOS Light Theme UI Polish Skill

This skill provides step-by-step instructions to elevate web and desktop frontend applications (React, Next.js, Tauri, Vue, Svelte) to the visual and tactile standards of **macOS Light Theme**, Dia browser, and Arc browser.

---

## 🎯 Goal

Transform dark, heavy, or unstyled user interfaces into clean, luminous, and frosted **macOS Light Theme** interfaces featuring liquid acrylic glassmorphism, floating capsule pill docks, subtle micro-borders, and spring micro-interactions.

---

## 🧭 Core Principles for macOS Light Theme

1. **Frosted Acrylic Translucency**:
   - Utilize high-translucency white surfaces (`rgba(255, 255, 255, 0.78)`) backed by heavy backdrop blurs (`backdrop-filter: blur(28px) saturate(180%)`).
2. **Subtle Light Depth & Ambient Diffuse Shadows**:
   - Replace harsh black drop shadows with soft, multi-layered diffuse shadows (`0 12px 36px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)`).
3. **Refined Hairline Micro-Borders**:
   - Use ultra-light hairline borders (`rgba(0, 0, 0, 0.08)`) coupled with top inner white specular highlights (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.85)`).
4. **Vibrant macOS Accents on Neutral Canvas**:
   - Pair clean `#f5f5f7` canvas backgrounds with macOS Accent Blue (`#007aff`), Emerald Green (`#34c759`), and classic traffic light window controls.

---

## 🛠️ Step-by-Step Instructions

### Step 1: Automated UI Audit
1. **Inspect Component Surfaces**:
   - Identify opaque dark surfaces, heavy borders, or harsh contrast artifacts.
2. **Flag Anti-Patterns**:
   - Flat solid grey cards or pitch-black containers.
   - Raw 1px solid black or dark grey borders.
   - Heavy drop shadows without blur diffusion.
   - Missing spring transition curves on interactive elements.

### Step 2: Applying macOS Light Design Tokens
1. Link or import the design tokens from [`resources/macos-design-system.css`](file:///d:/Agora/.agents/skills/macos-ui-polish/resources/macos-design-system.css).
2. Apply standard macOS Light CSS variables:
   - **Canvas Background**: `background-color: var(--macos-bg-base);` (`#f5f5f7`) with subtle dot grid.
   - **Floating Toolbars**: `background: var(--macos-surface-acrylic); backdrop-filter: var(--macos-blur-dock);`
   - **Card Containers**: `background: var(--macos-surface-card); box-shadow: var(--macos-shadow-card);`
   - **Borders & Inset Highlights**: `border: 1px solid var(--macos-border-subtle); box-shadow: var(--macos-inner-glow);`
   - **Typography**: `font-family: var(--macos-font-sans); color: var(--macos-text-primary);` (`#1d1d1f`)
   - **Micro-Interactions**: `transition: all var(--macos-duration-fast) var(--macos-ease-spring);`

### Step 3: Component Refactoring Checklist
- [ ] **Floating Pill Toolbar**: Convert toolbar to a centered floating pill capsule dock (`border-radius: 9999px`) with soft hover effects (`rgba(0, 0, 0, 0.05)`).
- [ ] **Canvas Workspace**: Apply macOS light base background (`#f5f5f7`) with a 24px subtle dot grid overlay (`rgba(0, 0, 0, 0.07)`).
- [ ] **Modal Sheets & Dialogs**: Wrap panels in light acrylic glass (`rgba(255, 255, 255, 0.88)`), backdrop blur (`blur(36px)`), and soft ambient elevation shadows.
- [ ] **Segmented Buttons & Tabs**: Use rounded pill controls that trigger active accent pill highlights (`#007aff` or crisp elevated white pill).
- [ ] **Window Headers**: Add macOS traffic lights (Red `#ff5f56`, Yellow `#ffbd2e`, Green `#27c93f`) with 12px circular frames.

---

## 💡 Best Practices

* **High Readability Contrast**:
  Ensure body text uses deep charcoal (`#1d1d1f`) and secondary labels use muted slate (`rgba(60, 60, 67, 0.75)`) to maintain strict WCAG AAA contrast over frosted white surfaces.
* **Liquid Specular Highlights**:
  Always pair light acrylic backgrounds with `inset 0 1px 1px 0 rgba(255, 255, 255, 0.85)` to simulate the natural top-edge bevel reflection of macOS glass.
* **Spring Dynamics**:
  Use `cubic-bezier(0.16, 1, 0.3, 1)` and `transform: scale(0.96)` on button press states for authentic Apple tactile feedback.
