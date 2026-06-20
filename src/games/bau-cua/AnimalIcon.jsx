// Recognizable flat illustrations for the six Bầu Cua symbols. Each is drawn in
// a 0 0 48 48 viewBox so the same artwork scales cleanly across the betting
// medallions, the rolled dice and the small history strip.

const eye = (cx, cy, r = 2.1) => (
  <g key={`eye-${cx}-${cy}`}>
    <circle cx={cx} cy={cy} r={r} fill="#fff" />
    <circle cx={cx} cy={cy} r={r * 0.5} fill="#160d0d" />
  </g>
);

function shapeFor(id, c) {
  switch (id) {
    case 'bau': // bottle gourd: small head, round body, stem + leaf
      return (
        <>
          <path d="M23 9c1.5-2.5 4-3 6-2" fill="none" stroke="#5d4037" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M29 6c2.5-1 4.6.4 4 2.8-2.4 1-4.4-.3-4-2.8z" fill="#8bc34a" />
          <ellipse cx="24" cy="19" rx="6.8" ry="6" fill={c} />
          <ellipse cx="24" cy="32.5" rx="10.5" ry="10.5" fill={c} />
          <ellipse cx="20" cy="30" rx="2.8" ry="5" fill="rgba(255,255,255,0.3)" />
        </>
      );
    case 'cua': // crab: wide body, two pincers on stalks, six legs, eyes
      return (
        <>
          <g stroke={c} strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M13 29 L5 26" />
            <path d="M13 32 L5 33" />
            <path d="M14 35 L7 40" />
            <path d="M35 29 L43 26" />
            <path d="M35 32 L43 33" />
            <path d="M34 35 L41 40" />
            <path d="M15 26 L9 20" />
            <path d="M33 26 L39 20" />
            <path d="M9 20 L4 17" />
            <path d="M9 20 L4 22.5" />
            <path d="M39 20 L44 17" />
            <path d="M39 20 L44 22.5" />
          </g>
          <ellipse cx="24" cy="30" rx="12" ry="8" fill={c} />
          <g stroke={c} strokeWidth="2" strokeLinecap="round">
            <path d="M21 23 L20 19" />
            <path d="M27 23 L28 19" />
          </g>
          {eye(20, 18, 2)}
          {eye(28, 18, 2)}
        </>
      );
    case 'tom': // shrimp: curved segmented body, tail fan, antennae, legs
      return (
        <>
          <path d="M32 12 C41 17 42 30 33 37 C29 40 24 41 19 39" fill="none" stroke={c} strokeWidth="8" strokeLinecap="round" />
          <g stroke={c} strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M19 39 L13 36" />
            <path d="M19 39 L14 42.5" />
            <path d="M19 39 L20.5 44" />
          </g>
          <g stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none">
            <path d="M34 33 L37 37" />
            <path d="M30 36 L32 40" />
            <path d="M26 38 L27 42" />
          </g>
          <g stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M32 12 L41 6" />
            <path d="M32 13 L42.5 11" />
          </g>
          {eye(31, 15, 1.9)}
        </>
      );
    case 'ca': // fish: body, triangular tail, top fin, eye, gill
      return (
        <>
          <path d="M7 24 L16 16 L16 32 Z" fill={c} />
          <ellipse cx="27" cy="24" rx="14" ry="9" fill={c} />
          <path d="M22 16 L27 9 L32 16 Z" fill={c} />
          <path d="M30 18 Q28 24 30 30" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
          {eye(34, 21, 2.1)}
          <path d="M37 26 Q39.5 27 40 25" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case 'ga': // rooster: body, tail plumes, head, red comb + wattle, beak, legs
      return (
        <>
          <g fill="none" strokeLinecap="round">
            <path d="M14 32 C5 26 7 15 14 12" stroke="#e08a2b" strokeWidth="4" />
            <path d="M16 33 C9 28 10 18 17 14" stroke={c} strokeWidth="4" />
          </g>
          <g stroke="#e08a2b" strokeWidth="2" strokeLinecap="round">
            <path d="M20 39 L20 44" />
            <path d="M26 39 L26 44" />
          </g>
          <ellipse cx="23" cy="31" rx="11" ry="9" fill={c} />
          <circle cx="32" cy="18" r="6.5" fill={c} />
          <path d="M27 11.5q2-4 4 0q2-4 4 1l-1 3q-4-2-7 0z" fill="#e53935" />
          <ellipse cx="35" cy="24" rx="2.2" ry="3.2" fill="#e53935" />
          <path d="M38 17 L44 19 L38 21 Z" fill="#ffca28" stroke="#e08a2b" strokeWidth="0.6" />
          {eye(33, 16, 1.7)}
        </>
      );
    case 'nai': // deer: branched antlers, ears, face, snout, eyes
      return (
        <>
          <g fill="none" stroke="#8d6e63" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 19 L15 9 M15 13 L11 11 M16 11 L13 7" />
            <path d="M29 19 L33 9 M33 13 L37 11 M32 11 L35 7" />
          </g>
          <ellipse cx="15" cy="22" rx="3" ry="4.5" fill={c} transform="rotate(-25 15 22)" />
          <ellipse cx="33" cy="22" rx="3" ry="4.5" fill={c} transform="rotate(25 33 22)" />
          <path d="M16 24 Q16 18 24 18 Q32 18 32 24 Q32 34 24 40 Q16 34 16 24 Z" fill={c} />
          <ellipse cx="24" cy="35" rx="4.5" ry="4" fill="rgba(0,0,0,0.18)" />
          <ellipse cx="24" cy="36" rx="2.2" ry="1.6" fill="#4e342e" />
          {eye(20, 27, 1.8)}
          {eye(28, 27, 1.8)}
        </>
      );
    default:
      return null;
  }
}

export function AnimalIcon({ id, color, className, style }) {
  return (
    <svg viewBox="0 0 48 48" className={className} style={style}>
      {shapeFor(id, color)}
    </svg>
  );
}
