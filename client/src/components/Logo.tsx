// Brand mark (unchanged shape), now in the accent colour. Used by the navbar and footer.
export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5L3.5 7.5V16.5L12 21.5L20.5 16.5V7.5L12 2.5Z" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 9V15L15 12L10 9Z" fill="var(--accent-ink)" />
    </svg>
  );
}
