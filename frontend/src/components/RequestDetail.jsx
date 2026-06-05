import { useState } from "react"
import api from "../utils/api"

const copy = text => navigator.clipboard.writeText(text).catch(() => {})

export default function RequestDetail({ request, onDelete, showToast, webhookUrl }) {
  const [tab,        setTab]       = useState("body")   // body | headers | raw | analysis | security
  const [analysis,   setAnalysis]  = useState(request.analysis?.aiAnalysis || null)
  const [security,   setSecurity]  = useState(request.analysis?.securityAnalysis || null)
  const [aiLoading,  setAiLoading] = useState(false)
  const [secLoading, setSecLoading]= useState(false)
  const [prettyBody, setPrettyBody]= useState(true)

  const runAnalysis = async () => {
    setAiLoading(true)
    try {
      const { data } = await api.post(`/api/requests/analyze/${request._id}`)
      setAnalysis(data)
      setTab("analysis")
      showToast("AI analysis complete")
    } catch {
      showToast("Analysis failed", "error")
    } finally {
      setAiLoading(false)
    }
  }

  const runSecurity = async () => {
    setSecLoading(true)
    try {
      const { data } = await api.post(`/api/requests/security-scan/${request._id}`)
      setSecurity(data.security || data)
      setTab("security")
      showToast("Security scan complete")
    } catch {
      showToast("Security scan failed", "error")
    } finally {
      setSecLoading(false)
    }
  }

  const bodyStr = () => {
    if (!request.body) return "—"
    try {
      return prettyBody
        ? JSON.stringify(request.body, null, 2)
        : JSON.stringify(request.body)
    } catch { return String(request.body) }
  }

  const rawRequest = () => {
    const lines = []
    lines.push(`${request.method} ${request.url || `/hooks/${request.token}`} HTTP/1.1`)
    lines.push(`Host: ${new URL(webhookUrl || "http://localhost:5002").host}`)
    if (request.headers) {
      Object.entries(request.headers).forEach(([k, v]) => lines.push(`${k}: ${v}`))
    }
    lines.push("")
    lines.push(bodyStr())
    return lines.join("\n")
  }

  const riskColor = lvl => ({ high: "#ef4444", medium: "#f59e0b", low: "#10b981" })[lvl] || "#6b7280"
  const scoreColor = n => n >= 80 ? "#10b981" : n >= 60 ? "#f59e0b" : "#ef4444"

  return (
    <div className="req-detail">
      {/* Top bar */}
      <div className="detail-topbar">
        <div className="detail-meta-row">
          <span className={`method-badge method-${request.method?.toLowerCase()}`}>{request.method}</span>
          <span className={`status-badge status-${Math.floor(request.statusCode / 100)}xx`}>{request.statusCode}</span>
          <span className="detail-time">{new Date(request.timestamp).toLocaleString()}</span>
          <span className="detail-ip">IP: {request.ip || "—"}</span>
          {request.responseTime > 0 && (
            <span className="detail-rt">{request.responseTime}ms</span>
          )}
        </div>
        <div className="detail-actions">
          <button
            className="btn-analyze" onClick={runAnalysis} disabled={aiLoading}
            title="Run AI analysis"
          >
            {aiLoading ? "Analyzing…" : "🤖 AI Analyze"}
          </button>
          <button
            className="btn-security" onClick={runSecurity} disabled={secLoading}
            title="Run security scan"
          >
            {secLoading ? "Scanning…" : "🔐 Security Scan"}
          </button>
          <button
            className="btn-danger-sm" onClick={() => {
              if (confirm("Delete this request?")) onDelete()
            }}
            title="Delete request"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Service & risk badges */}
      {(request.service?.name || request.analysis?.riskLevel) && (
        <div className="detail-badges">
          {request.service?.name && request.service.name !== "Unknown" && (
            <span className="badge-service">{request.service.name}</span>
          )}
          {request.analysis?.riskLevel && (
            <span className="badge-risk" style={{ background: riskColor(request.analysis.riskLevel) }}>
              {request.analysis.riskLevel.toUpperCase()} RISK
            </span>
          )}
          {request.location?.country && request.location.country !== "Unknown" && (
            <span className="badge-geo">🌍 {request.location.city !== "Unknown"
              ? `${request.location.city}, ${request.location.country}`
              : request.location.country}
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="detail-tabs">
        {["body","headers","raw","analysis","security"].map(t => (
          <button
            key={t}
            className={`detail-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "analysis" && analysis && <span className="tab-dot green" />}
            {t === "security" && security && <span className="tab-dot" style={{ background: riskColor(security.riskLevel) }} />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="detail-content">

        {/* BODY */}
        {tab === "body" && (
          <div>
            <div className="content-toolbar">
              <span className="toolbar-label">
                {request.contentType || "application/json"}
                {request.size > 0 && <span className="toolbar-size"> · {(request.size / 1024).toFixed(1)}KB</span>}
              </span>
              <div className="toolbar-actions">
                <button className="icon-btn-sm" onClick={() => setPrettyBody(p => !p)}>
                  {prettyBody ? "Raw" : "Pretty"}
                </button>
                <button className="icon-btn-sm" onClick={() => { copy(bodyStr()); showToast("Copied") }}>
                  📋 Copy
                </button>
              </div>
            </div>
            <pre className="code-block">{bodyStr()}</pre>
            {request.query && Object.keys(request.query).length > 0 && (
              <>
                <div className="content-toolbar" style={{ marginTop: 16 }}>
                  <span className="toolbar-label">Query Parameters</span>
                </div>
                <pre className="code-block">{JSON.stringify(request.query, null, 2)}</pre>
              </>
            )}
          </div>
        )}

        {/* HEADERS */}
        {tab === "headers" && (
          <div>
            <div className="content-toolbar">
              <span className="toolbar-label">{Object.keys(request.headers || {}).length} headers</span>
              <button className="icon-btn-sm" onClick={() => {
                copy(JSON.stringify(request.headers, null, 2)); showToast("Copied")
              }}>📋 Copy</button>
            </div>
            <table className="headers-table">
              <thead>
                <tr><th>Header</th><th>Value</th></tr>
              </thead>
              <tbody>
                {Object.entries(request.headers || {}).map(([k, v]) => (
                  <tr key={k}>
                    <td className="header-key">{k}</td>
                    <td className="header-val">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* RAW */}
        {tab === "raw" && (
          <div>
            <div className="content-toolbar">
              <span className="toolbar-label">Raw HTTP Request</span>
              <button className="icon-btn-sm" onClick={() => { copy(rawRequest()); showToast("Copied") }}>
                📋 Copy
              </button>
            </div>
            <pre className="code-block raw-block">{rawRequest()}</pre>
          </div>
        )}

        {/* ANALYSIS */}
        {tab === "analysis" && (
          <div className="analysis-panel">
            {!analysis ? (
              <div className="empty-state">
                <p>No analysis yet. Click <strong>🤖 AI Analyze</strong> to run AI analysis.</p>
                <button className="btn-primary" onClick={runAnalysis} disabled={aiLoading}>
                  {aiLoading ? "Analyzing…" : "Run AI Analysis"}
                </button>
              </div>
            ) : (
              <>
                {/* Service */}
                <section className="analysis-section">
                  <h4 className="section-title">Service Detection</h4>
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <div className="kpi-label">Service</div>
                      <div className="kpi-value blue">{analysis.service?.name || "Unknown"}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Confidence</div>
                      <div className="kpi-value">{analysis.service?.confidence || "—"}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Category</div>
                      <div className="kpi-value">{analysis.service?.category || "—"}</div>
                    </div>
                    <div className="kpi-card">
                      <div className="kpi-label">Event Type</div>
                      <div className="kpi-value">{analysis.eventType || analysis.event?.type || "—"}</div>
                    </div>
                  </div>
                  {analysis.service?.description && (
                    <p className="analysis-desc">{analysis.service.description}</p>
                  )}
                </section>

                {/* Scores */}
                {analysis.calculatedMetrics && (
                  <section className="analysis-section">
                    <h4 className="section-title">AI-Calculated Scores</h4>
                    <div className="scores-grid">
                      {Object.entries({
                        "Security":    analysis.calculatedMetrics.securityScore,
                        "Performance": analysis.calculatedMetrics.performanceScore,
                        "Business":    analysis.calculatedMetrics.businessValueScore,
                        "Automation":  analysis.calculatedMetrics.automationPotential,
                        "Complexity":  analysis.calculatedMetrics.complexityScore,
                        "Risk":        analysis.calculatedMetrics.riskScore,
                      }).filter(([,v]) => v !== undefined).map(([k, v]) => (
                        <div key={k} className="score-item">
                          <div className="score-label">{k}</div>
                          <div className="score-bar-wrap">
                            <div className="score-bar" style={{ width: `${v}%`, background: scoreColor(v) }} />
                          </div>
                          <div className="score-num" style={{ color: scoreColor(v) }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Business */}
                {analysis.business && (
                  <section className="analysis-section">
                    <h4 className="section-title">Business Impact</h4>
                    <div className="kpi-grid">
                      <div className="kpi-card"><div className="kpi-label">Value</div><div className="kpi-value">{analysis.business.value || "—"}</div></div>
                      <div className="kpi-card"><div className="kpi-label">Use Case</div><div className="kpi-value">{analysis.business.useCase || "—"}</div></div>
                      <div className="kpi-card"><div className="kpi-label">Revenue Impact</div><div className="kpi-value">{analysis.business.revenueImpact || "—"}</div></div>
                      <div className="kpi-card"><div className="kpi-label">Automation Opp.</div><div className="kpi-value">{analysis.business.automationOpportunity || "—"}</div></div>
                    </div>
                  </section>
                )}

                {/* Insights */}
                {analysis.insights?.keyFindings?.length > 0 && (
                  <section className="analysis-section">
                    <h4 className="section-title">Key Findings</h4>
                    <ul className="findings-list">
                      {analysis.insights.keyFindings.map((f, i) => (
                        <li key={i} className="finding-item">✦ {f}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Recommendations */}
                {(analysis.recommendations?.length > 0 || analysis.insights?.recommendations?.length > 0) && (
                  <section className="analysis-section">
                    <h4 className="section-title">Recommendations</h4>
                    <ul className="findings-list rec-list">
                      {(analysis.recommendations || analysis.insights?.recommendations || []).map((r, i) => (
                        <li key={i} className="rec-item">→ {r}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Automation */}
                {analysis.automation && (
                  <section className="analysis-section">
                    <h4 className="section-title">Automation Analysis</h4>
                    <div className="kpi-grid">
                      <div className="kpi-card"><div className="kpi-label">Potential</div><div className="kpi-value">{analysis.automation.potential || "—"}</div></div>
                      <div className="kpi-card"><div className="kpi-label">Time Savings</div><div className="kpi-value">{analysis.automation.timeSavings || "—"}</div></div>
                      <div className="kpi-card"><div className="kpi-label">Complexity</div><div className="kpi-value">{analysis.automation.complexity || "—"}</div></div>
                    </div>
                  </section>
                )}

                {/* Compliance */}
                {analysis.compliance && (
                  <section className="analysis-section">
                    <h4 className="section-title">Compliance</h4>
                    <div className="compliance-badges">
                      {analysis.compliance.gdprRelevant  && <span className="comp-badge">GDPR</span>}
                      {analysis.compliance.pciRelevant   && <span className="comp-badge">PCI DSS</span>}
                      {analysis.compliance.hipaaRelevant && <span className="comp-badge">HIPAA</span>}
                      {analysis.compliance.regulations?.map((r, i) => <span key={i} className="comp-badge">{r}</span>)}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* SECURITY */}
        {tab === "security" && (
          <div className="analysis-panel">
            {!security ? (
              <div className="empty-state">
                <p>No security scan yet. Click <strong>🔐 Security Scan</strong>.</p>
                <button className="btn-primary" onClick={runSecurity} disabled={secLoading}>
                  {secLoading ? "Scanning…" : "Run Security Scan"}
                </button>
              </div>
            ) : (
              <>
                {/* Score overview */}
                <section className="security-hero">
                  <div className="sec-score-circle" style={{ "--score-color": scoreColor(security.overallScore || security.score || 0) }}>
                    <div className="sec-score-num">{security.overallScore || security.score || 0}</div>
                    <div className="sec-score-label">/ 100</div>
                  </div>
                  <div className="sec-overview">
                    <div className="risk-level-badge" style={{ background: riskColor(security.riskLevel) }}>
                      {(security.riskLevel || "unknown").toUpperCase()} RISK
                    </div>
                    <p className="sec-summary">
                      {security.riskLevel === "high"   && "⚠ High risk detected — immediate action required"}
                      {security.riskLevel === "medium" && "⚡ Moderate risk — review recommendations below"}
                      {security.riskLevel === "low"    && "✓ Low risk — webhook appears secure"}
                      {!security.riskLevel             && "Security scan completed"}
                    </p>
                  </div>
                </section>

                {/* Threat assessment */}
                {security.threatAssessment && (
                  <section className="analysis-section">
                    <h4 className="section-title">Threat Assessment</h4>
                    <div className="threat-grid">
                      {Object.entries(security.threatAssessment).map(([k, v]) => (
                        <div key={k} className="threat-item">
                          <span className="threat-label">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className={`threat-value ${
                            String(v).toLowerCase().includes("safe") || String(v).toLowerCase().includes("strong") || String(v).toLowerCase().includes("excellent")
                              ? "green" : String(v).toLowerCase().includes("weak") || String(v).toLowerCase().includes("danger")
                              ? "red" : "yellow"
                          }`}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Concerns */}
                {security.concerns?.length > 0 && (
                  <section className="analysis-section">
                    <h4 className="section-title">Security Concerns ({security.concerns.length})</h4>
                    <ul className="concerns-list">
                      {security.concerns.map((c, i) => (
                        <li key={i} className="concern-item">
                          <span className="concern-icon">⚠</span>
                          <span>{typeof c === "string" ? c : c.description || JSON.stringify(c)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Recommendations */}
                {security.recommendations?.length > 0 && (
                  <section className="analysis-section">
                    <h4 className="section-title">Recommendations</h4>
                    <ul className="findings-list rec-list">
                      {security.recommendations.map((r, i) => (
                        <li key={i} className="rec-item">
                          → {typeof r === "string" ? r : r.action || JSON.stringify(r)}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Compliance */}
                <section className="analysis-section">
                  <h4 className="section-title">Security Checklist</h4>
                  <div className="checklist">
                    {[
                      ["HTTPS transport",             true],
                      ["Signature verification",      security.threatAssessment?.authenticationStrength === "strong"],
                      ["Content-Type header present", !!Object.keys(security.threatAssessment || {}).length],
                      ["No malicious payload",        security.threatAssessment?.payloadSafety !== "dangerous"],
                      ["Data integrity",              security.threatAssessment?.dataIntegrity !== "poor"],
                    ].map(([label, ok]) => (
                      <div key={label} className={`check-item ${ok ? "check-ok" : "check-fail"}`}>
                        <span>{ok ? "✓" : "✕"}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
