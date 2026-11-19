export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading events">
      <div className="skeleton" style={{ height: 52, width: 240, margin: "40px 0 24px" }} />
      <div style={{ display: "flex", gap: 18, marginBottom: 20 }}>
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 64, height: 64, borderRadius: 16 }} />)}
      </div>
      <div className="skeleton" style={{ height: 70, marginBottom: 32 }} />
      <div className="grid-cards">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 380 }} />)}
      </div>
    </div>
  );
}
