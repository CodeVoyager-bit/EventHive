export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton" style={{ height: 64, width: 320, margin: "40px 0 28px" }} />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 112 }} />)}
      </div>
      <div className="skeleton" style={{ height: 320 }} />
    </div>
  );
}
