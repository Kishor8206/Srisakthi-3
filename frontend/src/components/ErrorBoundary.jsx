import React from "react"

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "64px",
            marginBottom: "16px"
          }}>⚠️</div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "700",
            marginBottom: "12px",
            background: "linear-gradient(to right, #38bdf8, #818cf8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Something went wrong</h1>
          <p style={{
            color: "#94a3b8",
            maxWidth: "480px",
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "24px"
          }}>
            An unexpected error occurred in the application. Try refreshing the page, or contact support if the issue persists.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              fontSize: "15px",
              fontWeight: "600",
              color: "#ffffff",
              backgroundColor: "#4f46e5",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4338ca"}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#4f46e5"}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
