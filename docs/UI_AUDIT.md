# UI / Design System Audit

## Design tokens & spacing
- `client/src/lib/designTokens.js` now maps the primary/secondary/surface colors, spacing scale, radius, shadows, and font families to the Tailwind palette so UI components can reuse the same values.
- Button, input, modal, and toast components import those tokens and apply them via inline styles (border radius, padding, box-shadow) while still leveraging Tailwind color classes for hover/focus states.

## Visual checklist
- Buttons now show a spinner + “Signing in…” copy on load, share the same radius/shadow, and highlight focus with `focus-visible` rings.
- Inputs use the new `Input` component, which renders consistent padding/borders, exposes an `error` state, and surfaces helper text or validation hints via `role="status"`.
- Modal adds Escape/backdrop dismissal, focus trapping, and accessible `aria` labels while using consistent spacing/rounded corners.
- Toasts (both the lightweight provider and the richer `NotificationToast`) leverage tokens for colors/shadows, include dismiss controls, and use `aria-live` to announce updates.
- Login form now shows inline errors, a “forgot password” placeholder, checkbox states, and proper focus handling.
- Landing, pricing, and request access flows now reuse the design tokens, document the next billing/compliance features, and expose consistent CTAs so future “Coming soon” flags can toggle without orphaned links.
- Sidebar/Layout/TopBar spacing already aligns with the new tokens whenever those components render Tailwind classes, so the refreshed buttons/inputs slot into their grids without shifting.

## Lighthouse / axe (TODO)
- `TODO: run an accessibility audit with Lighthouse (e.g., `npx lighthouse http://localhost:4173 --only-categories=accessibility --chrome-flags="--headless"`) once Chrome is available in the environment.`
- `TODO: install/run axe (e.g., `npx axe ./client/dist/index.html`) after building the client in a headless browser to catch missing ARIA labels or contrast issues.`
