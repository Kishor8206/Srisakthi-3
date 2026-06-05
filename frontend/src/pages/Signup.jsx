import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../utils/api"

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setError("")
    if (form.password !== form.confirm) return setError("Passwords do not match")
    if (form.password.length < 6) return setError("Password must be at least 6 characters")
    setLoading(true)
    try {
      const { data } = await api.post("/api/auth/signup", {
        name: form.name, email: form.email, password: form.password
      })
      localStorage.setItem("token",  data.token)
      localStorage.setItem("userId", data.userId)
      localStorage.setItem("email",  data.email)
      localStorage.setItem("name",   data.name || "")
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-brand">
        <div className="brand-logo">⚡</div>
        <h1 className="brand-title">WebhookInspector</h1>
        <p className="brand-sub">Enterprise webhook testing &amp; monitoring</p>
        <ul className="brand-features">
          <li>✓ Real-time request capture</li>
          <li>✓ AI-powered analysis</li>
          <li>✓ Security scanning</li>
          <li>✓ Export &amp; reporting</li>
        </ul>
      </div>

      <div className="auth-form-wrap">
        <div className="auth-card">
          <h2 className="auth-heading">Create your account</h2>
          <p className="auth-sub">Start monitoring webhooks in seconds</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label>Full Name</label>
              <input type="text" placeholder="John Doe" value={form.name} onChange={set("name")} />
            </div>
            <div className="field">
              <label>Email address</label>
              <input type="email" required placeholder="john@company.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" required placeholder="Min 6 characters" value={form.password} onChange={set("password")} />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input type="password" required placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
