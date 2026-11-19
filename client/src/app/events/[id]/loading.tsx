export default function Loading() {
  return (
    <div className="container" aria-busy="true" aria-label="Loading event">
      <div className="skeleton" style={{ height: 20, width: 120, margin: "28px 0 20px" }} />
      <div className="skeleton" style={{ height: 64, width: "60%", marginBottom: 24 }} />
      <div className="skeleton" style={{ aspectRatio: "21 / 8", marginBottom: 36 }} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 400px", gap: 56 }}>
        <div className="skeleton" style={{ height: 420 }} />
        <div className="skeleton" style={{ height: 520 }} />
      </div>
    </div>
  );
}
