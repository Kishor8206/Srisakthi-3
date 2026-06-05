import { useState } from "react"
import API_URL from "../config"

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

export default function WebhookList({
  webhooks, selected, allRequests,
  onSelect, onCreate, onDelete, onClear, showToast
}) {
  const [showCreate,  setShowCreate]  = useState(false)
  const [name,        setName]        = useState("")
  const [description, setDesc]        = useState("")
  const [creating,    setCreating]    = useState(false)
  const [copiedId,    setCopiedId]    = useState(null)
  const [deletingId,  setDeletingId]  = useState(null)

  const handleCreate = async e => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await onCreate({ name: name.trim(), description: description.trim() })
      setName("")
      setDesc("")
      setShowCreate(false)
    } catch {
      // error handled in Dashboard
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = (url, id) => {
    copyText(url)
    setCopiedId(id)
    showToast("URL copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Delete this webhook and ALL its requests? This cannot be undone.")) return
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  const reqCount = id => {
    const hook = webhooks.find(w => w._id === id)
    return hook ? allRequests.filter(r => r.token === hook.token).length : 0
  }

  return (
    <aside className="webhook-sidebar">
      <div className="sidebar-header">
        <div>
          <h2 className="sidebar-title">My Webhooks</h2>
          <p className="sidebar-sub">{webhooks.length} endpoint{webhooks.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn-primary-sm" onClick={() => setShowCreate(true)}>
          + New
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Webhook</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="field">
                <label>Name <span className="required">*</span></label>
                <input
                  type="text" required maxLength={80}
                  placeholder="e.g. Stripe Payments"
                  value={name} onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Description <span className="optional">(optional)</span></label>
                <input
                  type="text" maxLength={200}
                  placeholder="Brief description…"
                  value={description} onChange={e => setDesc(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating || !name.trim()}>
                  {creating ? "Creating…" : "Create Webhook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="webhook-list">
        {webhooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🪝</div>
            <p>No webhooks yet</p>
            <button className="btn-primary-sm" onClick={() => setShowCreate(true)}>
              Create your first webhook
            </button>
          </div>
        ) : (
          webhooks.map(hook => {
            const url = hook.webhook_url || hook.public_url ||
              `${API_URL}/hooks/${hook.token}`
            const isSelected = selected?._id === hook._id
            const count = reqCount(hook._id)

            return (
              <div
                key={hook._id}
                className={`webhook-item ${isSelected ? "webhook-item-active" : ""}`}
                onClick={() => onSelect(hook)}
              >
                <div className="webhook-item-top">
                  <div className="webhook-item-info">
                    <span className={`webhook-dot ${hook.isActive !== false ? "dot-green" : "dot-gray"}`} />
                    <span className="webhook-name">{hook.name}</span>
                  </div>
                  <div className="webhook-item-actions" onClick={e => e.stopPropagation()}>
                    <button
                      className="icon-btn-sm"
                      title="Copy URL"
                      onClick={() => handleCopy(url, hook._id)}
                    >
                      {copiedId === hook._id ? "✓" : "📋"}
                    </button>
                    <button
                      className="icon-btn-sm danger"
                      title="Delete webhook"
                      disabled={deletingId === hook._id}
                      onClick={e => handleDelete(e, hook._id)}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {hook.description && (
                  <p className="webhook-desc">{hook.description}</p>
                )}

                <div className="webhook-url-row">
                  <code className="webhook-url-code">{url}</code>
                </div>

                <div className="webhook-meta">
                  <span className="meta-badge">{count} request{count !== 1 ? "s" : ""}</span>
                  {hook.isActive === false && <span className="meta-badge badge-gray">Inactive</span>}
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
