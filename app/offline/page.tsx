// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#020617",
        color: "white",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>
          📴 You&apos;re offline
        </h1>
        <p style={{ marginTop: "8px", fontSize: "14px", color: "#9ca3af" }}>
          AZMATH can still open, but it needs internet to load new questions.
          Reconnect to continue your math challenge.
        </p>
      </div>
    </main>
  );
}
