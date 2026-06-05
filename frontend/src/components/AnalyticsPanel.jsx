import { useMemo } from "react"
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement
} from "chart.js"
import { Bar, Line, Doughnut } from "react-chartjs-2"

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip,
  Legend, ArcElement, PointElement, LineElement
)

const COLORS = ["#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#64748b"]

export default function AnalyticsPanel({ webhooks, allRequests }) {
  const stats = useMemo(() => {
    const total   = allRequests.length
    const success = allRequests.filter(r => r.statusCode >= 200 && r.statusCode < 300).length
    const errors  = allRequests.filter(r => r.statusCode >= 400).length
    const last24h = allRequests.filter(r =>
      new Date(r.timestamp) > new Date(Date.now() - 86_400_000)
    ).length

    const byMethod = {}
    const byStatus = {}
    const byService = {}
    const byHour = Array(24).fill(0)
    const byCountry = {}
    const riskDist = { low: 0, medium: 0, high: 0, unknown: 0 }

    allRequests.forEach(r => {
      byMethod[r.method || "UNKNOWN"] = (byMethod[r.method || "UNKNOWN"] || 0) + 1
      const sc = String(r.statusCode || "unknown")
      byStatus[sc] = (byStatus[sc] || 0) + 1
      const svc = r.service?.name || "Unknown"
      byService[svc] = (byService[svc] || 0) + 1
      byHour[new Date(r.timestamp).getHours()]++
      const country = r.location?.country || "Unknown"
      byCountry[country] = (byCountry[country] || 0) + 1
      const risk = r.analysis?.riskLevel || "unknown"
      riskDist[risk] = (riskDist[risk] || 0) + 1
    })

    const avgResponseTime = allRequests.length
      ? (allRequests.reduce((s, r) => s + (r.responseTime || 100), 0) / allRequests.length).toFixed(0)
      : 0

    return {
      total, success, errors, last24h, avgResponseTime,
      successRate: total ? ((success / total) * 100).toFixed(1) : "0.0",
      errorRate:   total ? ((errors  / total) * 100).toFixed(1) : "0.0",
      byMethod, byStatus, byService, byHour, byCountry, riskDist
    }
  }, [allRequests])

  const chartOpts = (title = "") => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: !!title, text: title } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  })

  const pieOpts = { responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } }
  }

  const topCountries = Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const topServices  = Object.entries(stats.byService).sort((a,b)=>b[1]-a[1]).slice(0,8)

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: { total: stats.total, success: stats.success, errors: stats.errors,
        successRate: stats.successRate + "%", last24h: stats.last24h },
      byMethod: stats.byMethod,
      byService: stats.byService,
      riskDistribution: stats.riskDist,
      topCountries: Object.fromEntries(topCountries)
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `analytics-report-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="analytics-panel">
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">Analytics Dashboard</h2>
          <p className="analytics-sub">All-time stats across {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="btn-outline-sm" onClick={exportReport}>⬇ Export Report</button>
      </div>

      {/* KPI cards */}
      <div className="kpi-cards">
        <div className="kpi-card-big blue">
          <div className="kpi-big-icon">📨</div>
          <div>
            <div className="kpi-big-num">{stats.total.toLocaleString()}</div>
            <div className="kpi-big-label">Total Requests</div>
            <div className="kpi-big-sub">{stats.last24h} in last 24h</div>
          </div>
        </div>
        <div className="kpi-card-big green">
          <div className="kpi-big-icon">✓</div>
          <div>
            <div className="kpi-big-num">{stats.successRate}%</div>
            <div className="kpi-big-label">Success Rate</div>
            <div className="kpi-big-sub">{stats.success} successful</div>
          </div>
        </div>
        <div className="kpi-card-big red">
          <div className="kpi-big-icon">✕</div>
          <div>
            <div className="kpi-big-num">{stats.errorRate}%</div>
            <div className="kpi-big-label">Error Rate</div>
            <div className="kpi-big-sub">{stats.errors} errors</div>
          </div>
        </div>
        <div className="kpi-card-big purple">
          <div className="kpi-big-icon">🪝</div>
          <div>
            <div className="kpi-big-num">{webhooks.length}</div>
            <div className="kpi-big-label">Active Webhooks</div>
            <div className="kpi-big-sub">Avg {stats.avgResponseTime}ms response</div>
          </div>
        </div>
      </div>

      {/* Risk distribution */}
      <div className="risk-bar-section">
        <h3 className="chart-title">Risk Distribution</h3>
        <div className="risk-dist-row">
          {[
            { label: "Low",     count: stats.riskDist.low,     color: "#10b981" },
            { label: "Medium",  count: stats.riskDist.medium,  color: "#f59e0b" },
            { label: "High",    count: stats.riskDist.high,    color: "#ef4444" },
            { label: "Unknown", count: stats.riskDist.unknown, color: "#6b7280" },
          ].map(({ label, count, color }) => (
            <div key={label} className="risk-dist-item">
              <div className="risk-dist-count" style={{ color }}>{count}</div>
              <div className="risk-dist-bar-wrap">
                <div className="risk-dist-bar" style={{
                  width: stats.total ? `${(count / stats.total) * 100}%` : "0%",
                  background: color
                }} />
              </div>
              <div className="risk-dist-label">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">
        {/* Hourly activity */}
        <div className="chart-card span2">
          <h3 className="chart-title">24-Hour Request Activity</h3>
          <div className="chart-wrap">
            <Line
              data={{
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                  label: "Requests",
                  data: stats.byHour,
                  borderColor: "#6366f1",
                  backgroundColor: "rgba(99,102,241,0.1)",
                  tension: 0.4, fill: true
                }]
              }}
              options={chartOpts()}
            />
          </div>
        </div>

        {/* By method */}
        <div className="chart-card">
          <h3 className="chart-title">Requests by Method</h3>
          <div className="chart-wrap">
            <Bar
              data={{
                labels: Object.keys(stats.byMethod),
                datasets: [{
                  label: "Count",
                  data: Object.values(stats.byMethod),
                  backgroundColor: COLORS,
                }]
              }}
              options={chartOpts()}
            />
          </div>
        </div>

        {/* By status */}
        <div className="chart-card">
          <h3 className="chart-title">Response Status Codes</h3>
          <div className="chart-wrap">
            <Doughnut
              data={{
                labels: Object.keys(stats.byStatus),
                datasets: [{
                  data: Object.values(stats.byStatus),
                  backgroundColor: COLORS
                }]
              }}
              options={pieOpts}
            />
          </div>
        </div>

        {/* By service */}
        <div className="chart-card">
          <h3 className="chart-title">Top Services</h3>
          <div className="chart-wrap">
            <Bar
              data={{
                labels: topServices.map(([s]) => s),
                datasets: [{
                  label: "Requests",
                  data: topServices.map(([, c]) => c),
                  backgroundColor: COLORS
                }]
              }}
              options={{ ...chartOpts(), indexAxis: "y" }}
            />
          </div>
        </div>

        {/* By country */}
        <div className="chart-card">
          <h3 className="chart-title">Top Countries</h3>
          <div className="chart-wrap">
            <Bar
              data={{
                labels: topCountries.map(([c]) => c),
                datasets: [{
                  label: "Requests",
                  data: topCountries.map(([, n]) => n),
                  backgroundColor: COLORS
                }]
              }}
              options={{ ...chartOpts(), indexAxis: "y" }}
            />
          </div>
        </div>
      </div>

      {/* Per-webhook table */}
      {webhooks.length > 0 && (
        <div className="webhook-table-section">
          <h3 className="chart-title">Webhook Performance</h3>
          <table className="perf-table">
            <thead>
              <tr>
                <th>Webhook</th>
                <th>Requests</th>
                <th>Success</th>
                <th>Errors</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map(wh => {
                const reqs    = allRequests.filter(r => r.token === wh.token)
                const success = reqs.filter(r => r.statusCode >= 200 && r.statusCode < 300).length
                const errors  = reqs.filter(r => r.statusCode >= 400).length
                const last    = reqs[0]?.timestamp
                return (
                  <tr key={wh._id}>
                    <td>{wh.name}</td>
                    <td><strong>{reqs.length}</strong></td>
                    <td className="green">{success}</td>
                    <td className="red">{errors}</td>
                    <td className="muted">{last ? new Date(last).toLocaleString() : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
