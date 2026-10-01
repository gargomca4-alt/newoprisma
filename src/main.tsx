import React, { Component, ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px 20px", maxWidth: "700px", margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ color: "#991b1b", margin: "0 0 12px 0", fontSize: "20px" }}>
              ⚠️ Erreur de chargement de l'application
            </h2>
            <p style={{ color: "#7f1d1d", fontSize: "14px", marginBottom: "16px" }}>
              {this.state.error?.message || "Une erreur inattendue est survenue."}
            </p>
            <pre style={{ background: "#fff", padding: "12px", borderRadius: "6px", fontSize: "12px", overflowX: "auto", color: "#333", border: "1px solid #fca5a5" }}>
              {this.state.error?.stack}
            </pre>
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.reload();
                }}
                style={{ padding: "10px 18px", background: "#0f2a5c", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                Vider le cache & Actualiser
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: "10px 18px", background: "#e2e8f0", color: "#1e293b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  );
}
