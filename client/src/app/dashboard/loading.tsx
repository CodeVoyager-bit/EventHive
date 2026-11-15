export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton" style={{ height: 56, width: 280, margin: "40px 0 28px" }} />
      <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 28 }}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 128 }} />)}
      </div>
      <div className="skeleton" style={{ height: 360 }} />
    </div>
  );
}
