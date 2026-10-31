# macOS Tahoe & Dia UI Design Guidelines (Light Theme Primary)

Detailed design rules and material specifications for engineering light-mode macOS user interfaces across web and desktop applications.

---

## 1. Material Layers & Acrylic Surfaces (Light Mode)

| Element | Background | Blur Filter | Border / Highlight |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#f5f5f7` or `#ffffff` | None (with 24px subtle dot grid) | None |
| **Floating Dock / Toolbar** | `rgba(255, 255, 255, 0.78)` | `blur(28px) saturate(180%)` | `1px solid rgba(0, 0, 0, 0.08)` + inner white glow |
| **Sidebars & Panels** | `rgba(246, 246, 248, 0.82)` | `blur(24px) saturate(180%)` | Right border `rgba(0, 0, 0, 0.06)` |
| **Modal Sheets** | `rgba(255, 255, 255, 0.88)` | `blur(36px) saturate(190%)` | `1px solid rgba(0, 0, 0, 0.12)` + modal shadow |
| **Card Containers** | `rgba(255, 255, 255, 0.9)` | `blur(16px)` | `1px solid rgba(0, 0, 0, 0.06)` |

---

## 2. Interactive Control Styles

### Floating Pill Toolbar (Dia Style)
- Capsule shaped (`border-radius: 9999px`).
- Frosted light glass background: `rgba(255, 255, 255, 0.78)` with `backdrop-filter: blur(28px) saturate(180%)`.
- Ambient shadow: `0 12px 36px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)`.
- Subtle top reflection inner glow: `inset 0 1px 1px 0 rgba(255, 255, 255, 0.85)`.

### Segmented Controls & Buttons
- **Default state**: Transparent background with dark neutral text (`rgba(60, 60, 67, 0.75)`).
- **Hover state**: Soft neutral light highlight (`rgba(0, 0, 0, 0.05)`).
- **Active / Selected state**: macOS Accent Blue (`#007aff`) with white icon/text, or crisp white capsule button with dark icon and drop shadow (`0 1px 2px rgba(0, 0, 0, 0.06)`).
- **Press state**: Tactile micro-scale `scale(0.96)`.

---

## 3. Window & Canvas Header Controls
- **Traffic Light Controls**:
  - Close: `#ff5f56`
  - Minimize: `#ffbd2e`
  - Zoom: `#27c93f`
  - Size: 12px circle with 8px spacing.
- **Canvas Dot Grid (Light Mode)**:
  ```css
  background-image: radial-gradient(rgba(0, 0, 0, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  ```

---

## 4. Typography & Contrast in Light Theme
- Primary text: `#1d1d1f` (SF Pro, High readability).
- Secondary text: `rgba(60, 60, 67, 0.75)`.
- Tertiary text: `rgba(60, 60, 67, 0.45)`.
- Focus ring: `#007aff` with `box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25)`.
