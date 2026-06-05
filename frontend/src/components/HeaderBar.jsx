export default function HeaderBar({
  email, name, darkMode, onToggleDark, onLogout,
  activeTab, onTabChange, totalWebhooks, totalRequests
}) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          <span className="logo-icon">⚡</span>
          <div>
            <span className="logo-title">WebhookInspector</span>
            <span className="logo-badge">Enterprise</span>
          </div>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-tab ${activeTab === "webhooks" ? "active" : ""}`}
            onClick={() => onTabChange("webhooks")}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Webhooks
            <span className="nav-count">{totalWebhooks}</span>
          </button>
          <button
            className={`nav-tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => onTabChange("analytics")}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
            <span className="nav-count">{totalRequests}</span>
          </button>
        </nav>
      </div>

      <div className="header-right">
        <button className="icon-btn" onClick={onToggleDark} title="Toggle dark mode">
          {darkMode ? "☀️" : "🌙"}
        </button>
        <div className="user-chip">
          <div className="user-avatar">{(name || email || "U")[0].toUpperCase()}</div>
          <span className="user-email">{name || email}</span>
        </div>
        <button className="btn-outline-sm" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}
