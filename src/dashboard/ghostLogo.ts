export function ghostLogoSvg(className = "ghost-logo", title = "GhostAPI logo"): string {
  return `<svg class="${className}" viewBox="0 0 128 128" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ghostapi-logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="5" dy="5" stdDeviation="0" flood-color="#080808" flood-opacity="1" />
    </filter>
  </defs>
  <rect x="10" y="14" width="108" height="100" rx="28" fill="#fffdf8" stroke="#080808" stroke-width="6" filter="url(#ghostapi-logo-shadow)" />
  <path d="M32 40L20 52L32 64" fill="none" stroke="#080808" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M96 40L108 52L96 64" fill="none" stroke="#080808" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M64 24C46.5 24 35 37.4 35 54.5V94L43.5 87L52 94L60.5 87L69 94L77.5 87L86 94L93 88V54.5C93 37.4 81.5 24 64 24Z" fill="#bdb0ff" stroke="#080808" stroke-width="6" stroke-linejoin="round" />
  <path d="M43 75C50.5 69.2 57.2 69.2 64 75C70.8 69.2 77.5 69.2 85 75" fill="none" stroke="#080808" stroke-width="5" stroke-linecap="round" />
  <circle cx="54" cy="55" r="5.5" fill="#080808" />
  <circle cx="74" cy="55" r="5.5" fill="#080808" />
  <path d="M52 32C58 28 70 28 76 32" fill="none" stroke="#fffdf8" stroke-width="5" stroke-linecap="round" opacity="0.85" />
  <rect x="26" y="84" width="30" height="18" rx="5" fill="#ff4d1c" stroke="#080808" stroke-width="5" />
  <rect x="72" y="84" width="30" height="18" rx="5" fill="#ffc812" stroke="#080808" stroke-width="5" />
</svg>`;
}
