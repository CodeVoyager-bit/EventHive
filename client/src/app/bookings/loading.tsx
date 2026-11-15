export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading tickets">
      <div className="skeleton" style={{ height: 56, width: 260, margin: "40px 0 32px" }} />
      <div style={{ display: "grid", gap: 18, maxWidth: 940 }}>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
      </div>
    </div>
  );
}
