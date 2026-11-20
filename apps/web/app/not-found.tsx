import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f2ee",
        color: "#18181b",
        padding: "24px",
        fontFamily: "var(--font-jakarta), system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "460px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e7e5de",
          borderRadius: "18px",
          padding: "32px 28px",
          textAlign: "center",
          boxShadow: "0 2px 12px rgba(24,24,27,0.04)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#e85a24",
          }}
        >
          404 · Not Found
        </p>
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "22px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            margin: "0 0 22px",
            fontSize: "13.5px",
            lineHeight: 1.6,
            color: "#64625b",
          }}
        >
          The link you opened may have moved or is not available in this
          DocuMind workspace.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "36px",
              padding: "0 16px",
              borderRadius: "10px",
              background: "#18181b",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Open Dashboard
          </Link>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "36px",
              padding: "0 16px",
              borderRadius: "10px",
              border: "1px solid #e4e2dc",
              background: "#ffffff",
              color: "#18181b",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
