const Endpoint  = require("../models/WebhookEndpoint")
const Request   = require("../models/WebhookRequest")
const unifiedAI = require("../services/unifiedAIService")

/* ── GET /api/requests/user  (uses JWT) */
exports.getUserRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    const endpoints = await Endpoint.find({ userId })
    const tokens = endpoints.map(e => e.token)
    const requests = await Request.find({ token: { $in: tokens } })
      .sort({ timestamp: -1 })
      .limit(500)
    res.json(requests)
  } catch (err) {
    console.error("Get user requests error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ── GET /api/requests/by-token/:token  (protected: must own the webhook) */
exports.getRequestsByToken = async (req, res) => {
  try {
    const { token } = req.params
    const userId = req.user.userId

    // Verify ownership
    const endpoint = await Endpoint.findOne({ token, userId })
    if (!endpoint)
      return res.status(403).json({ error: "Not authorized to view these requests" })

    const requests = await Request.find({ token })
      .sort({ timestamp: -1 })
      .limit(200)
    res.json(requests)
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ── GET /api/requests/detail/:id */
exports.getRequestById = async (req, res) => {
  try {
    const userId = req.user.userId
    const request = await Request.findById(req.params.id)
    if (!request) return res.status(404).json({ error: "Request not found" })

    // Verify ownership via endpoint
    const endpoint = await Endpoint.findOne({ token: request.token, userId })
    if (!endpoint) return res.status(403).json({ error: "Not authorized" })

    res.json(request)
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ── POST /api/requests/analyze/:id */
exports.analyzeRequest = async (req, res) => {
  try {
    const userId  = req.user.userId
    const request = await Request.findById(req.params.id)
    if (!request) return res.status(404).json({ error: "Request not found" })

    const endpoint = await Endpoint.findOne({ token: request.token, userId })
    if (!endpoint) return res.status(403).json({ error: "Not authorized" })

    const analysis = await unifiedAI.analyzeWebhook({
      headers:   request.headers || {},
      body:      request.body    || {},
      method:    request.method  || "POST",
      ip:        request.ip      || "unknown",
      userAgent: request.userAgent || "unknown"
    })

    // Persist analysis in request document
    request.analysis = {
      ...request.analysis,
      aiAnalysis: analysis,
      riskLevel: analysis?.security?.riskLevel || request.analysis?.riskLevel || "low"
    }
    await request.save()

    res.json({ requestId: request._id, ...analysis, timestamp: new Date() })
  } catch (err) {
    console.error("Analyze request error:", err)
    res.status(500).json({ error: "Analysis failed", details: err.message })
  }
}

/* ── POST /api/requests/security-scan/:id */
exports.securityScan = async (req, res) => {
  try {
    const userId  = req.user.userId
    const request = await Request.findById(req.params.id)
    if (!request) return res.status(404).json({ error: "Request not found" })

    const endpoint = await Endpoint.findOne({ token: request.token, userId })
    if (!endpoint) return res.status(403).json({ error: "Not authorized" })

    const analysis = await unifiedAI.analyzeWebhook({
      headers:   request.headers || {},
      body:      request.body    || {},
      method:    request.method  || "POST",
      ip:        request.ip      || "unknown",
      userAgent: request.userAgent || "unknown"
    })

    // Persist security analysis
    request.analysis = {
      ...request.analysis,
      securityAnalysis: analysis?.security || {},
      riskLevel: analysis?.security?.riskLevel || request.analysis?.riskLevel || "low"
    }
    await request.save()

    res.json({
      requestId: request._id,
      security:  analysis?.security,
      service:   analysis?.service,
      analysis:  analysis?.analysis,
      calculatedMetrics: analysis?.calculatedMetrics,
      enhancedRecommendations: analysis?.enhancedRecommendations,
      timestamp: new Date()
    })
  } catch (err) {
    console.error("Security scan error:", err)
    res.status(500).json({ error: "Security scan failed", details: err.message })
  }
}

/* ── DELETE /api/requests/:id */
exports.deleteRequest = async (req, res) => {
  try {
    const userId  = req.user.userId
    const request = await Request.findById(req.params.id)
    if (!request) return res.status(404).json({ error: "Request not found" })

    const endpoint = await Endpoint.findOne({ token: request.token, userId })
    if (!endpoint) return res.status(403).json({ error: "Not authorized" })

    await Request.findByIdAndDelete(req.params.id)
    res.json({ message: "Request deleted" })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}
