# Accessibility Smoke Check – Phase 4

1. **TopBar keyboard flow:** Tabbing from left to right lands on the logo/link (skipped), search field (aria-labelled & focusable), language toggle, dark-mode toggle, notification trigger, and profile dropdown toggle; all elements announce their purpose, and the notification/profile overlays close with Escape or by tabbing away, so no traps were observed.
2. **Sidebar navigation:** Tab order enters the collapse control, then sequentially hits each visible navigation link; disabled/preview links remain unfocusable via disabled buttons, keeping the focus flow linear even when the panel is collapsed.
3. **Focus visibility & announcements:** Focus rings appear on all buttons/links, and the current-time widget plus search/autocomplete announce updates using aria-live; no elements capture focus without providing a way to escape.

No additional keyboard traps or missing focusable controls emerged during this quick smoke check.
