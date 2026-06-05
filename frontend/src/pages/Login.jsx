import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../utils/api"

export default function Login() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { data } = await api.post("/api/auth/login", { email, password })
      localStorage.setItem("token",  data.token)
      localStorage.setItem("userId", data.userId)
      localStorage.setItem("email",  data.email)
      localStorage.setItem("name",   data.name || "")
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.")
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
          <h2 className="auth-heading">Welcome back</h2>
          <p className="auth-sub">Sign in to your account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label>Email address</label>
              <input
                type="email" required autoComplete="email"
                placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password" required autoComplete="current-password"
                placeholder="Your password"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : "Sign In"}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
