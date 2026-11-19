// Brand mark: a hive cell with a play mark, printed in hive yellow and ink. Used by the navbar and footer.
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.2L3.4 7.2V16.8L12 21.8L20.6 16.8V7.2L12 2.2Z" fill="var(--hive)" stroke="var(--ink-fixed)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 8.8V15.2L15.4 12L10 8.8Z" fill="var(--ink-fixed)" />
    </svg>
  );
}
