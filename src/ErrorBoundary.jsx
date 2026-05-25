import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            fontFamily: "system-ui,sans-serif",
            background: "#16171d",
            color: "#f3f4f6",
            maxWidth: 720,
            margin: "0 auto",
            textAlign: "left",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: "#9ca3af", marginBottom: 16 }}>
            Open the browser console (F12) for details.
          </p>
          <pre
            style={{
              overflow: "auto",
              padding: 16,
              borderRadius: 8,
              background: "#0b0c10",
              fontSize: 13,
              color: "#fca5a5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {String(err?.message || err)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              background: "#c9a047",
              color: "#091829",
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
