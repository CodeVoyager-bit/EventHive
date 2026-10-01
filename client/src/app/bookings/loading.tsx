export default function Loading() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading tickets">
      <div className="skeleton" style={{ height: 40, width: 220, marginBottom: 28 }} />
      <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 150 }} />)}
      </div>
    </div>
  );
}
