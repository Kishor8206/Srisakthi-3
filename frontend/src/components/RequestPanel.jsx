import { useState, useMemo } from "react"
import api from "../utils/api"
import RequestDetail from "./RequestDetail"
import API_URL from "../config"

const METHOD_COLORS = {
  GET: "method-get", POST: "method-post",
  PUT: "method-put", DELETE: "method-delete",
  PATCH: "method-patch"
}

const STATUS_CLASS = code => {
  if (code >= 200 && code < 300) return "status-2xx"
  if (code >= 300 && code < 400) return "status-3xx"
  if (code >= 400 && code < 500) return "status-4xx"
  if (code >= 500) return "status-5xx"
  return "status-unknown"
}

export default function RequestPanel({
  webhook, requests, selectedRequest, onSelectRequest, onDeleteRequest, showToast
}) {
  const [search,    setSearch]    = useState("")
  const [method,    setMethod]    = useState("all")
  const [sort,      setSort]      = useState("newest")
  const [configOpen, setConfigOpen] = useState(false)

  const filtered = useMemo(() => {
    let r = [...requests]
    if (method !== "all") r = r.filter(x => x.method === method)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x =>
        x.method?.toLowerCase().includes(q) ||
        x.ip?.includes(q) ||
        JSON.stringify(x.body || {}).toLowerCase().includes(q) ||
        x.userAgent?.toLowerCase().includes(q)
      )
    }
    if (sort === "newest") r.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
    else if (sort === "oldest") r.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))
    else if (sort === "method") r.sort((a,b) => a.method.localeCompare(b.method))
    return r
  }, [requests, method, search, sort])

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${webhook?.name || "requests"}-${Date.now()}.json`
    a.click()
    showToast("Exported as JSON")
  }

  const exportCSV = () => {
    const rows = [["ID","Method","Status","IP","Timestamp","Event","Service"]]
    filtered.forEach(r => rows.push([
      r._id, r.method, r.statusCode, r.ip,
      new Date(r.timestamp).toISOString(),
      r.body?.event || r.body?.type || "",
      r.service?.name || ""
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${webhook?.name || "requests"}-${Date.now()}.csv`
    a.click()
    showToast("Exported as CSV")
  }

  if (!webhook) return (
    <div className="request-panel empty-panel">
      <div className="empty-state">
        <div className="empty-icon">🪝</div>
        <p>Select a webhook to see its requests</p>
      </div>
    </div>
  )

  const url = webhook.webhook_url || webhook.public_url || `${API_URL}/hooks/${webhook.token}`

  return (
    <div className="request-panel">
      {/* Webhook info bar */}
      <div className="webhook-bar">
        <div className="webhook-bar-left">
          <h2 className="wh-name">{webhook.name}</h2>
          <div className="url-row">
            <code className="url-code">{url}</code>
            <button className="icon-btn-sm" onClick={() => {
              navigator.clipboard.writeText(url)
              showToast("URL copied")
            }}>📋</button>
          </div>
        </div>
        <div className="webhook-bar-right">
          <button className="btn-outline-sm" onClick={() => setConfigOpen(true)}>
            ⚙ Configure
          </button>
          <button className="btn-outline-sm" onClick={exportJSON}>⬇ JSON</button>
          <button className="btn-outline-sm" onClick={exportCSV}>⬇ CSV</button>
        </div>
      </div>

      <div className="panel-body">
        {/* Request list */}
        <div className="req-list-col">
          {/* Filters */}
          <div className="filter-bar">
            <input
              type="text" placeholder="Search requests…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="filter-input"
            />
            <select value={method} onChange={e => setMethod(e.target.value)} className="filter-select">
              <option value="all">All methods</option>
              {["GET","POST","PUT","DELETE","PATCH"].map(m =>
                <option key={m} value={m}>{m}</option>
              )}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="filter-select">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="method">Method</option>
            </select>
          </div>

          <div className="req-count-row">
            <span className="req-count">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
            {filtered.length > 0 && <span className="req-live-dot" />}
          </div>

          <div className="req-list">
            {filtered.length === 0 ? (
              <div className="empty-state small">
                <p>{requests.length === 0
                  ? "No requests yet. Send a request to your webhook URL."
                  : "No requests match your filters."
                }</p>
              </div>
            ) : (
              filtered.map(req => (
                <div
                  key={req._id}
                  className={`req-item ${selectedRequest?._id === req._id ? "req-item-active" : ""}`}
                  onClick={() => onSelectRequest(req)}
                >
                  <div className="req-item-top">
                    <span className={`method-badge ${METHOD_COLORS[req.method] || "method-other"}`}>
                      {req.method}
                    </span>
                    <span className={`status-badge ${STATUS_CLASS(req.statusCode)}`}>
                      {req.statusCode}
                    </span>
                    <span className="req-time">
                      {new Date(req.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="req-item-meta">
                    <span className="req-ip">{req.ip || "—"}</span>
                    {req.service?.name && req.service.name !== "Unknown" && (
                      <span className="req-service">{req.service.name}</span>
                    )}
                    {req.analysis?.riskLevel && req.analysis.riskLevel !== "low" && (
                      <span className={`risk-badge risk-${req.analysis.riskLevel}`}>
                        {req.analysis.riskLevel}
                      </span>
                    )}
                  </div>
                  {(req.body?.event || req.body?.type) && (
                    <div className="req-event">{req.body.event || req.body.type}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Request detail */}
        <div className="req-detail-col">
          {selectedRequest ? (
            <RequestDetail
              request={selectedRequest}
              onDelete={() => onDeleteRequest(selectedRequest._id)}
              showToast={showToast}
              webhookUrl={url}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👆</div>
              <p>Select a request to inspect its details</p>
            </div>
          )}
        </div>
      </div>

      {/* Config modal */}
      {configOpen && (
        <ConfigModal
          webhook={webhook}
          onClose={() => setConfigOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  )
}

/* ───────────────────────── ConfigModal ───────────────────────── */
function ConfigModal({ webhook, onClose, showToast }) {
  const [cfg, setCfg] = useState({
    statusCode: webhook.responseConfig?.statusCode || 200,
    contentType: webhook.responseConfig?.contentType || "application/json",
    body: webhook.responseConfig?.body || '{"message":"Webhook received"}',
    delay: webhook.responseConfig?.delay || 0,
    headers: webhook.responseConfig?.headers || []
  })
  const [isActive,     setIsActive]     = useState(webhook.isActive !== false)
  const [autoResponse, setAutoResponse] = useState(webhook.autoResponse !== false)
  const [saving,       setSaving]       = useState(false)
  const [newHdr,       setNewHdr]       = useState({ key: "", value: "" })

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/api/webhooks/${webhook._id}/config`, {
        responseConfig: cfg,
        isActive,
        autoResponse
      })
      showToast("Configuration saved")
      onClose()
    } catch {
      showToast("Failed to save configuration", "error")
    } finally {
      setSaving(false)
    }
  }

  const addHeader = () => {
    if (!newHdr.key || !newHdr.value) return
    setCfg(p => ({ ...p, headers: [...p.headers, { ...newHdr }] }))
    setNewHdr({ key: "", value: "" })
  }

  const removeHeader = i => setCfg(p => ({ ...p, headers: p.headers.filter((_, idx) => idx !== i) }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure Response — {webhook.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body modal-scroll">
          <div className="config-grid">
            {/* Left */}
            <div>
              <h4 className="cfg-section-title">Endpoint Settings</h4>
              <div className="toggle-row">
                <label className="toggle-label">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  <span>Endpoint active</span>
                </label>
                <label className="toggle-label">
                  <input type="checkbox" checked={autoResponse} onChange={e => setAutoResponse(e.target.checked)} />
                  <span>Auto-respond</span>
                </label>
              </div>

              <h4 className="cfg-section-title">Response</h4>
              <div className="field">
                <label>Status Code</label>
                <select value={cfg.statusCode} onChange={e => setCfg(p => ({ ...p, statusCode: +e.target.value }))} className="filter-select w-full">
                  {[200,201,204,400,401,403,404,422,429,500,502,503].map(c =>
                    <option key={c} value={c}>{c}</option>
                  )}
                </select>
              </div>
              <div className="field">
                <label>Content-Type</label>
                <select value={cfg.contentType} onChange={e => setCfg(p => ({ ...p, contentType: e.target.value }))} className="filter-select w-full">
                  {["application/json","text/plain","text/html","application/xml"].map(ct =>
                    <option key={ct} value={ct}>{ct}</option>
                  )}
                </select>
              </div>
              <div className="field">
                <label>Delay (ms): {cfg.delay}</label>
                <input type="range" min={0} max={10000} step={100}
                  value={cfg.delay} onChange={e => setCfg(p => ({ ...p, delay: +e.target.value }))} />
              </div>
            </div>

            {/* Right */}
            <div>
              <h4 className="cfg-section-title">Response Body</h4>
              <textarea
                className="code-textarea"
                rows={8}
                value={cfg.body}
                onChange={e => setCfg(p => ({ ...p, body: e.target.value }))}
              />

              <h4 className="cfg-section-title">Custom Headers</h4>
              {cfg.headers.map((h, i) => (
                <div key={i} className="header-row">
                  <span className="header-key">{h.key}</span>
                  <span className="header-val">{h.value}</span>
                  <button className="icon-btn-sm danger" onClick={() => removeHeader(i)}>✕</button>
                </div>
              ))}
              <div className="header-add-row">
                <input placeholder="Header name" value={newHdr.key}
                  onChange={e => setNewHdr(p => ({ ...p, key: e.target.value }))} />
                <input placeholder="Value" value={newHdr.value}
                  onChange={e => setNewHdr(p => ({ ...p, value: e.target.value }))} />
                <button className="btn-primary-sm" onClick={addHeader}>Add</button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  )
}
