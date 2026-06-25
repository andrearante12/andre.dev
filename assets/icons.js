/* Preset project-card icon library. Shared by the homepage renderer (index.html)
 * and the admin tool (assets/admin.js). Each value is inline SVG markup that
 * inherits `currentColor`, so the card's --card-accent tints it.
 * Add a new icon by adding a key here; it appears in the admin icon picker. */

window.SITE_ICONS = {
  arm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2.5" y="18.5" width="9" height="3.5" rx="0.5"/>
    <path d="M7 18.5 L7 14"/><circle cx="7" cy="14" r="1.4"/>
    <path d="M7 14 L14 8"/><circle cx="14" cy="8" r="1.4"/>
    <path d="M14 8 L19 8"/><path d="M17.5 6 L17.5 10 M20.5 6 L20.5 10"/>
  </svg>`,
  detection: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/>
    <circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/>
    <path d="M6.8 6.8 L17.2 17.2 M17.2 6.8 L6.8 17.2"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>`,
  cube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2.5 L20.5 7 L20.5 17 L12 21.5 L3.5 17 L3.5 7 Z"/>
    <path d="M3.5 7 L12 11.5 L20.5 7"/><path d="M12 11.5 L12 21.5"/>
  </svg>`,
  controller: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3.5" y="7" width="17" height="10" rx="3"/>
    <path d="M7.5 10 L7.5 14 M5.5 12 L9.5 12"/>
    <circle cx="15.5" cy="11" r="0.9"/><circle cx="17.5" cy="13.5" r="0.9"/>
    <path d="M3.5 9 L3.5 15 M20.5 9 L20.5 15"/>
  </svg>`,
  house: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 11.5 L12 3.5 L21 11.5"/><path d="M5 9.7 L5 20.5 L19 20.5 L19 9.7"/>
    <path d="M9.5 14 Q12 11.8 14.5 14"/><circle cx="12" cy="16" r="0.9" fill="currentColor"/>
    <path d="M9 20.5 L9 17 L15 17 L15 20.5"/>
  </svg>`,
  drone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/>
    <circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
    <path d="M6.6 7.6 L9.5 10 M17.4 7.6 L14.5 10 M6.6 16.4 L9.5 14 M17.4 16.4 L14.5 14"/>
  </svg>`,
  chip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="1.5"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.5"/>
    <path d="M9 6 V3 M15 6 V3 M9 21 V18 M15 21 V18 M6 9 H3 M6 15 H3 M21 9 H18 M21 15 H18"/>
  </svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="6.5" width="18" height="13" rx="2"/>
    <path d="M8 6.5 L9.5 4 L14.5 4 L16 6.5"/><circle cx="12" cy="13" r="3.2"/>
  </svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.5 12 C5 7 9 5 12 5 C15 5 19 7 21.5 12 C19 17 15 19 12 19 C9 19 5 17 2.5 12 Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  network: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/>
    <path d="M12 7.2 L12 12 M12 12 L6.5 16.2 M12 12 L17.5 16.2"/>
  </svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 7 L3.5 12 L8 17 M16 7 L20.5 12 L16 17 M13.5 5 L10.5 19"/>
  </svg>`,
  robot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="8" width="14" height="11" rx="2"/>
    <circle cx="9.5" cy="13" r="1.2"/><circle cx="14.5" cy="13" r="1.2"/>
    <path d="M12 8 V5 M12 5 H10.3 M9 16.5 H15"/><path d="M5 11 H3 M19 11 H21"/>
  </svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9 H16 M8 12 H16 M8 15 H13"/>
  </svg>`
};
