"use client";

// Last-resort error page for failures in the root layout itself, so it can't
// rely on the app's CSS or components.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", maxWidth: 380, padding: 24 }}>
          <h1 style={{ fontSize: 18 }}>Issue Logger is having trouble</h1>
          <p style={{ fontSize: 14, color: "#5b5b66" }}>Something failed while loading the app. Please try again.</p>
          {error.digest && <p style={{ fontSize: 12, color: "#8b8b96" }}>ref {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 8, padding: "8px 14px", borderRadius: 6, border: 0, background: "#5b5bd6", color: "white" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
