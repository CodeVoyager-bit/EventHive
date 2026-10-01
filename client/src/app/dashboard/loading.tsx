export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton" style={{ height: 40, width: 260, marginBottom: 28 }} />
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 82 }} />)}
      </div>
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}
