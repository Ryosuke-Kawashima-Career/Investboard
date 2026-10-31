---
name: macos-ui-polish
description: >-
  Audits, refactors, and polishes web and desktop application user interfaces to the professional standards of Dia Browser and macOS Light Theme, featuring framed inset canvases, liquid acrylic glassmorphism, optical corner nesting, and strictly functional components.
---

# macOS & Dia Browser Light Theme UI Polish Skill

This skill provides step-by-step instructions to elevate web and desktop frontend applications (React, Next.js, Tauri, Vue, Svelte) to the visual and tactile standards of **Dia Browser** (by The Browser Company) and **macOS Light Theme**.

---

## 🎯 Goal

Transform dark, heavy, or unstyled user interfaces into clean, luminous, and tactile **Dia Browser & macOS Light Theme** interfaces featuring framed inset workspaces, liquid acrylic glassmorphism, concentric optical radii, crisp elevated white pill controls, and spring micro-interactions—while ensuring **every single UI element is 100% functional**.

---

## 🧭 Core Principles

1. **Strict Functional Purity (Zero Unused Components)**:
   - **Every rendered component must be functional and wired to real application state or actions.**
   - Never introduce decorative, placeholder, or non-functional UI chrome—such as faux macOS window traffic lights (red, yellow, green buttons), dummy search/command inputs, fake status indicators, or unhooked shortcut badges.
   - If an existing component has no functional backing, remove it rather than styling it.
2. **Dia Inset "Framed Canvas" Architecture**:
   - Wrap the active application viewport in a subtle ambient shell (`#f2f2f5`) with `6px–10px` padding around an inset, rounded workspace (`border-radius: 14px`, crisp `#ffffff` surface, and `1px solid rgba(0, 0, 0, 0.07)` border).
3. **Frosted Acrylic Translucency & Specular Highlights**:
   - Utilize high-translucency light surfaces (`rgba(255, 255, 255, 0.78)`) backed by vibrant blur (`backdrop-filter: blur(28px) saturate(180%)`) and top-edge inner specular reflections (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.85)`).
4. **Crisp Elevated White Pills Over Heavy Blue Fills**:
   - Style active tabs and segmented controls with an elevated crisp white pill (`#ffffff` with subtle shadow `0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.06)`) inside a soft translucent track (`rgba(0, 0, 0, 0.04)`). Reserve vibrant macOS Accent Blue (`#007aff`) for primary CTAs and active focus states.
5. **Optical Corner Nesting (`R_outer = R_inner + padding`)**:
   - Align nested rounded corners optically so outer containers and inner interactive items share concentric curves (e.g., `12px` outer toolbar radius with `4px` padding and `8px` inner button radius).
6. **Precision Typography & Tabular Metrics**:
   - Pair `-0.02em` heading tracking and `-0.01em` UI control tracking with `font-variant-numeric: tabular-nums` on all live counters, timestamps, and metrics.

---

## 🛠️ Step-by-Step Instructions

### Step 1: Automated UI & Functionality Audit
1. **Audit Component Utility**:
   - Verify that every visible button, input, badge, and header control performs a real action. Delete any decorative or unused elements before styling.
2. **Flag Visual & Structural Anti-Patterns**:
   - Faux OS window controls (red, yellow, green dots) or non-interactive mock chrome.
   - Flat solid grey cards, pitch-black containers, or raw `1px solid` dark borders.
   - Mismatched nested border radii that create uneven corner gaps.
   - Heavy drop shadows without multi-layered blur diffusion.
   - Missing spring transition curves (`cubic-bezier(0.16, 1, 0.3, 1)`) on interactive elements.

### Step 2: Applying Dia & macOS Light Design Tokens
1. Link or import the design tokens from [`resources/macos-design-system.css`](./resources/macos-design-system.css).
2. Apply standard CSS variables and classes to **existing functional elements**:
   - **Framed App Shell & Viewport**: `.macos-app-shell` wrapping `.macos-framed-canvas`
   - **Floating Toolbars**: `background: var(--macos-surface-acrylic); backdrop-filter: var(--macos-blur-dock);`
   - **Segmented Tracks & Active Pills**: `.macos-segmented-track` and `.macos-segmented-btn`
   - **Command / Composer Inputs**: `.macos-composer-bar` (apply only when the app has a working input/search/prompt box)
   - **Typography & Numeric Alignment**: `font-family: var(--macos-font-sans); color: var(--macos-text-primary);` and `.macos-tabular-nums`

### Step 3: Component Refactoring Checklist
- [ ] **Prune Unused Components**: Remove all non-functional buttons, faux macOS traffic light dots, dead links, or decorative mock controls.
- [ ] **Dia Framed Canvas**: Wrap the main functional workspace in an inset rounded frame (`.macos-framed-canvas`) over the neutral shell background (`#f2f2f5`).
- [ ] **Floating Pill / Concentric Toolbar**: Style the functional toolbar as a floating acrylic capsule (`.macos-pill-toolbar`) or concentric container with optical corner nesting.
- [ ] **Elevated White Segmented Controls**: Refactor mode switchers or tabs to use `.macos-segmented-track` with crisp white active pills (`.macos-segmented-btn.active`).
- [ ] **Functional Inputs & Composers**: If the app includes a functional search, prompt, or command input, style it with `.macos-composer-bar` and only render `.macos-kbd` badges for keyboard shortcuts that are actively bound in code.
- [ ] **Modal Sheets & Popovers**: Wrap functional dialogs in light acrylic glass (`rgba(255, 255, 255, 0.88)`), `blur(36px)`, and soft ambient elevation shadows.

---

## 💡 Best Practices

* **No Visual Lies**:
  Never render a keyboard shortcut badge (`⌘K`), filter button, or window button unless its event handler is genuinely implemented and active.
* **High Readability Contrast**:
  Ensure primary text uses deep ink (`#1d1d1f`) and secondary labels use muted slate (`rgba(60, 60, 67, 0.72)`) to maintain strict WCAG contrast over frosted white surfaces.
* **Subtle Contextual Elevation**:
  When an input or AI composer is focused, use a soft ring + ambient halo (`var(--macos-shadow-composer-focus)`) instead of a harsh browser default outline.
* **Spring Dynamics**:
  Use `cubic-bezier(0.16, 1, 0.3, 1)` and `transform: scale(0.97)` on button press states for authentic Dia and macOS tactile feedback.
