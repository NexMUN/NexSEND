# Design System — NexMUN Notification Control

## Product Context
- **What this is:** A secure admin console for setting up notification infrastructure, managing organizations, and controlling service-key access.
- **Who it's for:** Engineering and operations teams running transactional/organizational notification pipelines.
- **Space/industry:** Developer infrastructure and notification tooling.
- **Project type:** Web app dashboard with setup/login entry flows.

## Aesthetic Direction
- **Direction:** Refined utilitarian calm
- **Decoration level:** Intentional
- **Mood:** Quiet, confident, and operationally clear. The UI should feel soothing during high-risk admin tasks while still communicating security and control.
- **Reference sites:** Notion, Linear, Arc admin surfaces (interaction clarity), Stripe dashboard (calm hierarchy)

## Typography
- **Display/Hero:** Fraunces — adds character and editorial confidence to headers without hurting legibility.
- **Body:** Manrope — clean and highly readable for long admin sessions.
- **UI/Labels:** Manrope SemiBold in tracked uppercase for labels and metadata.
- **Data/Tables:** JetBrains Mono for IDs/tokens; tabular visual rhythm for machine data.
- **Code:** JetBrains Mono
- **Loading:** `next/font/google` in `app/layout.tsx`
- **Scale:**
  - Display XL: 3rem / 700
  - H1: 2.25rem / 600
  - H2: 1.5rem / 600
  - H3: 1.25rem / 600
  - Body: 1rem / 500
  - Small: 0.875rem / 500
  - Caption: 0.8rem / 600 tracked

## Color
- **Approach:** Balanced, soothing greens and mineral blues over warm-cool neutrals.
- **Primary:** `#17695d` — primary action and emphasis.
- **Secondary:** `#e4efec` — contextual surfaces/chips.
- **Neutrals:** `#f4f8f7` to `#132320` in light; `#0d1715` to `#e6f0ee` in dark.
- **Semantic:**
  - success `#1c7d5d`
  - warning `#b0782e`
  - error `#b8464a`
  - info `#4f89a6`
- **Dark mode:** Preserve same hue identity; lower base luminance and soften saturation via muted surfaces and stronger border contrast.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Hybrid, strict dashboard structure with subtle atmospheric treatment.
- **Grid:**
  - Mobile: single-column flow
  - Tablet: stacked cards with two-column stat strips
  - Desktop: 12-column max grid with `max-w-7xl` content container
- **Max content width:** 80rem (`max-w-7xl`)
- **Border radius:** sm 8px, md 12px, lg 14px, pill 9999px

## Motion
- **Approach:** Intentional
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)

## Component Rules
- Buttons: always solid primary or subtle outlined secondary, never gradient-filled CTA buttons.
- Cards: translucent elevated surfaces with controlled blur and soft shadows.
- Inputs/selects: elevated neutral fills, visible ring focus, rounded-xl.
- Tables: bordered container, uppercase metadata headers, hover tint instead of harsh striping.
- Status badges: semantic tint backgrounds, uppercase micro labels.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-15 | Initial design system created | Replaced minimal default styling with a coherent soothing admin theme for better visual trust and readability. |
