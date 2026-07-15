/**
 * Brand mark — a small globe (circle + meridians) with a subtle cross,
 * echoing the Tabernacle of Grace logo (charcoal globe + crimson cross-arrow).
 */
export function GlobeMark({
  size = 24,
  stroke = '#fff',
}: {
  size?: number;
  stroke?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={1.3}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.4" />
      <ellipse cx="12" cy="12" rx="3.7" ry="8.4" />
      <path d="M3.6 12h16.8M4.9 7.4h14.2M4.9 16.6h14.2" />
      <path d="M12 3.4v17.2" strokeWidth={2.1} />
    </svg>
  );
}
