export default function UnderConstruction() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "28px",
        padding: "0 var(--pad-x)",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(38px, 9vw, 104px)",
          lineHeight: 0.92,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
        }}
      >
        Pierre Mouarkech
      </h1>

      <div style={{ width: "56px", height: "3px", background: "var(--accent)" }} />

      <p
        style={{
          margin: 0,
          fontSize: "clamp(13px, 1.4vw, 16px)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--fg-dim)",
        }}
      >
        Director of Photography
      </p>

      <p
        style={{
          margin: 0,
          maxWidth: "34ch",
          fontSize: "clamp(15px, 1.6vw, 18px)",
          lineHeight: 1.6,
          color: "var(--fg-faint)",
        }}
      >
        Site under construction.
      </p>
    </main>
  );
}
