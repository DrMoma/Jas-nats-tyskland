// Hand-drawn-looking SVG doodles. Slight path irregularity + a marker filter
// keep them from reading as vector-perfect.

const FILTER = `
  <filter id="sketchy">
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="3" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
  </filter>
`;

const PATHS = {
  heart: `<path d="M20 34 C4 22 4 8 16 6 C20 5 20 10 20 10 C20 10 20 5 24 6 C36 8 36 22 20 34 Z" />`,
  star: `<path d="M20 3 L24 15 L37 15 L26 23 L30 36 L20 28 L10 36 L14 23 L3 15 L16 15 Z" />`,
  smiley: `<circle cx="20" cy="20" r="16" />
    <circle cx="14" cy="17" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="26" cy="17" r="1.6" fill="currentColor" stroke="none" />
    <path d="M12 24 Q20 32 28 24" fill="none" />`,
  arrow: `<path d="M4 20 Q20 4 34 18" fill="none" />
    <path d="M26 12 L35 19 L27 24" fill="none" />`,
  circle: `<ellipse cx="20" cy="20" rx="16" ry="14" transform="rotate(-4 20 20)" />`,
  scribble: `<path d="M4 30 Q10 10 18 22 T30 8 T38 20" fill="none" />`,
};

export function doodleSvg(type) {
  const inner = PATHS[type] || PATHS.circle;
  return `
    <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <defs>${FILTER}</defs>
      <g filter="url(#sketchy)">${inner}</g>
    </svg>
  `;
}
