import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { io } from "socket.io-client"
import API_URL from "../config"
import api from "../utils/api"
import WebhookList from "../components/WebhookList"
import RequestPanel from "../components/RequestPanel"
import AnalyticsPanel from "../components/AnalyticsPanel"
import HeaderBar from "../components/HeaderBar"

export default function Dashboard() {
  const navigate  = useNavigate()
  const socketRef = useRef(null)

  const [webhooks,         setWebhooks]         = useState([])
  const [selectedWebhook,  setSelectedWebhook]  = useState(null)
  const [requests,         setRequests]         = useState([])
  const [allRequests,      setAllRequests]       = useState([])
  const [selectedRequest,  setSelectedRequest]  = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [activeTab,        setActiveTab]        = useState("webhooks") // webhooks | analytics
  const [toast,            setToast]            = useState(null)
  const [darkMode,         setDarkMode]         = useState(
    () => localStorage.getItem("darkMode") === "true"
  )

  const userId = localStorage.getItem("userId")
  const email  = localStorage.getItem("email")
  const name   = localStorage.getItem("name")

  /* ── toast helper ── */
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  /* ── dark mode ── */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
    localStorage.setItem("darkMode", darkMode)
  }, [darkMode])

  /* ── auth guard ── */
  useEffect(() => {
    if (!userId || !localStorage.getItem("token")) navigate("/login")
  }, [userId, navigate])

  /* ── socket ── */
  useEffect(() => {
    const s = io(API_URL, { transports: ["websocket", "polling"] })
    socketRef.current = s

    s.on("new_webhook", req => {
      setAllRequests(p => [req, ...p])
      setRequests(p => {
        if (req.token === selectedWebhook?.token) return [req, ...p]
        return p
      })
      showToast(`New ${req.method} request received`, "success")
    })

    return () => s.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWebhook?.token])

  /* ── fetch all data ── */
  const fetchAll = useCallback(async () => {
    if (!userId) return
    try {
      const [wRes, rRes] = await Promise.all([
        api.get("/api/webhooks/user"),
        api.get("/api/requests/user")
      ])
      setWebhooks(wRes.data)
      setAllRequests(rRes.data)
      if (wRes.data.length > 0 && !selectedWebhook) {
        setSelectedWebhook(wRes.data[0])
        const reqs = rRes.data.filter(r => r.token === wRes.data[0].token)
        setRequests(reqs)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedWebhook])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── select webhook ── */
  const selectWebhook = useCallback(async webhook => {
    setSelectedWebhook(webhook)
    setSelectedRequest(null)
    try {
      const { data } = await api.get(`/api/requests/by-token/${webhook.token}`)
      setRequests(data)
    } catch {
      setRequests(allRequests.filter(r => r.token === webhook.token))
    }
  }, [allRequests])

  /* ── create webhook ── */
  const createWebhook = useCallback(async ({ name, description }) => {
    try {
      const { data } = await api.post("/api/webhooks/create", { name, description })
      const newHook = data.webhook
      setWebhooks(p => [newHook, ...p])
      selectWebhook(newHook)
      showToast("Webhook created successfully")
      return newHook
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to create webhook", "error")
      throw err
    }
  }, [selectWebhook, showToast])

  /* ── delete webhook ── */
  const deleteWebhook = useCallback(async id => {
    try {
      await api.delete(`/api/webhooks/${id}`)
      setWebhooks(p => p.filter(w => w._id !== id))
      if (selectedWebhook?._id === id) {
        setSelectedWebhook(null)
        setRequests([])
        setSelectedRequest(null)
      }
      setAllRequests(p => p.filter(r => {
        const hook = webhooks.find(w => w._id === id)
        return !hook || r.token !== hook.token
      }))
      showToast("Webhook deleted")
    } catch (err) {
      showToast(err.response?.data?.error || "Delete failed", "error")
    }
  }, [selectedWebhook, webhooks, showToast])

  /* ── clear requests ── */
  const clearRequests = useCallback(async id => {
    try {
      await api.delete(`/api/webhooks/${id}/requests`)
      setRequests([])
      setAllRequests(p => {
        const hook = webhooks.find(w => w._id === id)
        return hook ? p.filter(r => r.token !== hook.token) : p
      })
      setSelectedRequest(null)
      showToast("Requests cleared")
    } catch {
      showToast("Failed to clear requests", "error")
    }
  }, [webhooks, showToast])

  /* ── delete single request ── */
  const deleteRequest = useCallback(async reqId => {
    try {
      await api.delete(`/api/requests/${reqId}`)
      setRequests(p => p.filter(r => r._id !== reqId))
      setAllRequests(p => p.filter(r => r._id !== reqId))
      if (selectedRequest?._id === reqId) setSelectedRequest(null)
      showToast("Request deleted")
    } catch {
      showToast("Failed to delete request", "error")
    }
  }, [selectedRequest, showToast])

  /* ── logout ── */
  const logout = () => {
    localStorage.clear()
    navigate("/login")
  }

  if (loading) return (
    <div className="loading-full">
      <div className="loading-spinner-lg" />
      <p>Loading dashboard...</p>
    </div>
  )

  return (
    <div className={`dashboard-root ${darkMode ? "dark" : ""}`}>
      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      <HeaderBar
        email={email}
        name={name}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onLogout={logout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalWebhooks={webhooks.length}
        totalRequests={allRequests.length}
      />

      <main className="dashboard-main">
        {activeTab === "webhooks" ? (
          <div className="webhooks-layout">
            {/* Left: webhook list */}
            <WebhookList
              webhooks={webhooks}
              selected={selectedWebhook}
              allRequests={allRequests}
              onSelect={selectWebhook}
              onCreate={createWebhook}
              onDelete={deleteWebhook}
              onClear={clearRequests}
              showToast={showToast}
            />

            {/* Right: request panel */}
            <RequestPanel
              webhook={selectedWebhook}
              requests={requests}
              selectedRequest={selectedRequest}
              onSelectRequest={setSelectedRequest}
              onDeleteRequest={deleteRequest}
              showToast={showToast}
            />
          </div>
        ) : (
          <AnalyticsPanel
            webhooks={webhooks}
            allRequests={allRequests}
          />
        )}
      </main>
    </div>
  )
}
