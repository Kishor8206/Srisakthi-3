const express = require("express")
const http    = require("http")
const cors    = require("cors")
const { Server } = require("socket.io")
require("dotenv").config()

require("./db")

const authRoutes      = require("./routes/authRoutes")
const webhookRoutes   = require("./routes/webhookRoutes")
const requestRoutes   = require("./routes/requestRoutes")
const aiMetricsRoutes = require("./routes/aiMetricsRoutes")

const Endpoint = require("./models/WebhookEndpoint")
const Request  = require("./models/WebhookRequest")
const { receiveWebhook } = require("./controllers/webhookController")

const app    = express()
const server = http.createServer(app)

/* ─── CORS ─────────────────────────────────────── */
app.use(cors({
  origin: true,        // reflect the request origin — allows all origins
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"]
}))

// Handle preflight for all routes (Express 5 compatible wildcard)
app.options("/{*path}", cors({
  origin: true,
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"]
}))

/* ─── BODY PARSER ───────────────────────────────── */
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

/* ─── SOCKET.IO ─────────────────────────────────── */
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
})

app.set("io", io)

io.on("connection", socket => {
  console.log("⚡ Client connected:", socket.id)
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id))
})

/* ─── API ROUTES ────────────────────────────────── */
app.use("/api/auth",       authRoutes)
app.use("/api/webhooks",   webhookRoutes)
app.use("/api/requests",   requestRoutes)
app.use("/api/ai-metrics", aiMetricsRoutes)

/* ─── WEBHOOK RECEIVERS ─────────────────────────── */
app.all("/hooks/:token", receiveWebhook)

/* ─── ROOT ──────────────────────────────────────── */
app.get("/", (req, res) => res.json({
  status: "running",
  message: "🚀 Smart Webhook Inspector API",
  version: "2.0.0"
}))

/* ─── HEALTH CHECK ──────────────────────────────── */
app.get("/health", (req, res) => res.json({ status: "healthy", uptime: process.uptime() }))

/* ─── GLOBAL ERROR HANDLER ──────────────────────── */
app.use((err, req, res, next) => {
  console.error("Unhandled Application Exception:", err)
  res.status(500).json({
    error: "Internal server error",
    message: err.message || "An unexpected error occurred"
  })
})

/* ─── START ─────────────────────────────────────── */
const PORT = process.env.PORT || 5002
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📡 Webhook URL: ${process.env.PUBLIC_WEBHOOK_URL || `http://localhost:${PORT}`}/hooks/{token}`)
})
