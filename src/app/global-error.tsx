"use client";

// Replaces the root layout when it crashes, so it carries its own minimal styles (no tokens, no providers).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const ref = (error.digest ?? "").slice(0, 8) || "unknown";
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0b0b0e", color: "#ececf1", display: "grid", minHeight: "100vh", placeItems: "center", textAlign: "center" }}>
        <div role="alert" style={{ maxWidth: 380, padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
          <p style={{ color: "#a3a3b0" }}>Please try again. If it keeps happening, contact support with this reference.</p>
          <p style={{ fontFamily: "monospace", fontSize: 12, color: "#a3a3b0" }}>ref {ref}</p>
          <button type="button" onClick={reset} style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, border: 0, background: "#c8283b", color: "#fff", fontSize: 14, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
