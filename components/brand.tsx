export function Brand({ light = false, caption = true }: { light?: boolean; caption?: boolean }) {
  return (
    <span className={`brand${light ? " brand-light" : ""}`} translate="no">
      <svg width="38" height="38" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="20" fill="currentColor" />
        <g stroke="var(--brand-orbit, #d9edbb)" strokeWidth="3">
          <ellipse cx="32" cy="32" rx="22" ry="10" transform="rotate(-40 32 32)" />
          <circle cx="32" cy="32" r="12" />
        </g>
        <circle cx="48" cy="18" r="5" fill="var(--brand-orbit, #d9edbb)" />
      </svg>
      <span>орбита{caption && <span className="brand-caption">СТУДЕНЧЕСКИЙ КАБИНЕТ</span>}</span>
    </span>
  );
}
