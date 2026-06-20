// The "bát úp" — an upside-down porcelain bowl that hides the dice between the
// shake and the reveal. Drawn as an SVG dome with a gold knob and rim so it
// reads as an actual bowl rather than a flat disc.
export default function ShakerBowl() {
  return (
    <svg viewBox="0 0 120 100" className="bowl-svg">
      <defs>
        <radialGradient id="bowlBody" cx="40%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#e05151" />
          <stop offset="55%" stopColor="#a31d1d" />
          <stop offset="100%" stopColor="#5e0e0e" />
        </radialGradient>
        <linearGradient id="bowlKnob" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6da86" />
          <stop offset="100%" stopColor="#9c7619" />
        </linearGradient>
      </defs>

      {/* cast shadow */}
      <ellipse cx="60" cy="90" rx="50" ry="8" fill="rgba(0,0,0,0.45)" />

      {/* dome body */}
      <path d="M10 76 C10 34 38 16 60 16 C82 16 110 34 110 76 Z"
        fill="url(#bowlBody)" stroke="#cfa12b" strokeWidth="2.5" />

      {/* gold decorative band */}
      <path d="M16 58 C30 51 90 51 104 58" fill="none"
        stroke="rgba(207,161,43,0.6)" strokeWidth="3" strokeLinecap="round" />

      {/* glossy highlight */}
      <ellipse cx="43" cy="38" rx="12" ry="8" fill="rgba(255,255,255,0.2)" />

      {/* rim where the bowl meets the plate */}
      <ellipse cx="60" cy="76" rx="50" ry="10" fill="#3a0a0a"
        stroke="#cfa12b" strokeWidth="2.5" />

      {/* knob */}
      <rect x="54" y="8" width="12" height="12" rx="3" fill="url(#bowlKnob)" />
      <ellipse cx="60" cy="9" rx="9" ry="6" fill="url(#bowlKnob)"
        stroke="#7a5c14" strokeWidth="1" />
    </svg>
  );
}
