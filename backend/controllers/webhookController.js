const Endpoint  = require("../models/WebhookEndpoint")
const Request   = require("../models/WebhookRequest")
const { v4: uuidv4 } = require("uuid")
const { ObjectId } = require("mongodb")
const {
  getLocationFromIP,
  detectService,
  analyzeRequestPattern,
  detectAnomalies
} = require("../services/analysisService")
const unifiedAI = require("../services/unifiedAIService")

const getPublicUrl = () =>
  process.env.PUBLIC_WEBHOOK_URL || `http://localhost:${process.env.PORT || 5002}`

/* ──────────────────────────────────────── CREATE */
exports.createWebhook = async (req, res) => {
  try {
    // userId comes from JWT middleware
    const userId = req.user.userId
    const { name, description } = req.body

    if (!name) return res.status(400).json({ error: "Webhook name is required" })

    // Enforce webhook limit per user
    const count = await Endpoint.countDocuments({ userId })
    if (count >= 20)
      return res.status(400).json({ error: "Webhook limit reached (20 max per account)" })

    const token = uuidv4()
    const endpoint = await Endpoint.create({ userId, name, description: description || "", token })

    const publicUrl = getPublicUrl()

    res.status(201).json({
      message: "Webhook created successfully",
      webhook: {
        ...endpoint.toObject(),
        webhook_url: `${publicUrl}/hooks/${token}`,
        public_url:  `${publicUrl}/hooks/${token}`,
        local_url:   `http://localhost:${process.env.PORT || 5002}/hooks/${token}`
      }
    })
  } catch (err) {
    console.error("Create webhook error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ──────────────────────────────────────── GET USER WEBHOOKS */
exports.getUserWebhooks = async (req, res) => {
  try {
    const userId = req.user.userId

    const webhooks = await Endpoint.find({ userId }).sort({ createdAt: -1 })
    const publicUrl = getPublicUrl()

    const enriched = webhooks.map(w => ({
      ...w.toObject(),
      webhook_url: `${publicUrl}/hooks/${w.token}`,
      public_url:  `${publicUrl}/hooks/${w.token}`,
      local_url:   `http://localhost:${process.env.PORT || 5002}/hooks/${w.token}`
    }))

    res.json(enriched)
  } catch (err) {
    console.error("Get user webhooks error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ──────────────────────────────────────── DELETE */
exports.deleteWebhook = async (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid webhook ID" })

    const webhook = await Endpoint.findOne({ _id: id, userId })
    if (!webhook)
      return res.status(404).json({ error: "Webhook not found or not owned by you" })

    await Request.deleteMany({ token: webhook.token })
    await Endpoint.findByIdAndDelete(id)

    res.json({ message: "Webhook and all requests deleted successfully" })
  } catch (err) {
    console.error("Delete webhook error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ──────────────────────────────────────── GET CONFIG */
exports.getWebhookConfig = async (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid webhook ID" })

    const webhook = await Endpoint.findOne({ _id: id, userId })
    if (!webhook)
      return res.status(404).json({ error: "Webhook not found or not owned by you" })

    res.json({ webhook })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ──────────────────────────────────────── UPDATE CONFIG */
exports.updateWebhookConfig = async (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params
    const { responseConfig, isActive, autoResponse, name, description } = req.body

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid webhook ID" })

    const webhook = await Endpoint.findOne({ _id: id, userId })
    if (!webhook)
      return res.status(404).json({ error: "Webhook not found or not owned by you" })

    if (responseConfig) {
      webhook.responseConfig = { ...webhook.responseConfig.toObject?.() || webhook.responseConfig, ...responseConfig }
    }
    if (typeof isActive === "boolean")   webhook.isActive = isActive
    if (typeof autoResponse === "boolean") webhook.autoResponse = autoResponse
    if (name) webhook.name = name
    if (description !== undefined) webhook.description = description

    await webhook.save()
    res.json({ message: "Configuration updated successfully", webhook })
  } catch (err) {
    console.error("Update webhook config error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ──────────────────────────────────────── CLEAR REQUESTS */
exports.clearWebhookRequests = async (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid webhook ID" })

    const webhook = await Endpoint.findOne({ _id: id, userId })
    if (!webhook)
      return res.status(404).json({ error: "Webhook not found or not owned by you" })

    const { deletedCount } = await Request.deleteMany({ token: webhook.token })
    res.json({ message: `Cleared ${deletedCount} requests` })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}

/* ──────────────────────────────────────── RECEIVE WEBHOOK */
exports.receiveWebhook = async (req, res) => {
  console.log("Webhook received");
  console.log("Token:", req.params.token);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  const startTime = Date.now()
  try {
    const token = req.params.token
    if (!token) return res.status(400).json({ error: "Token is required" })

    const clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      "unknown"

    const endpoint = await Endpoint.findOne({ token, isActive: true })

    if (!endpoint) {
      const request = await Request.create({
        token,
        method: req.method,
        statusCode: 404,
        headers: req.headers,
        body: req.body || {},
        query: req.query,
        ip: clientIP,
        userAgent: req.get("User-Agent") || "",
        contentType: req.get("Content-Type") || "",
        url: req.originalUrl,
        size: JSON.stringify(req.body || {}).length,
        timestamp: new Date()
      })
      const io = req.app.get("io")
      if (io) io.emit("new_webhook", request)
      return res.status(404).json({ error: "Webhook endpoint not found or inactive" })
    }

    // Run analysis in parallel (non-blocking — don't hold up response)
    const [location, aiResult] = await Promise.allSettled([
      getLocationFromIP(clientIP),
      unifiedAI.analyzeWebhook({
        headers: req.headers,
        body: req.body || {},
        method: req.method,
        ip: clientIP,
        userAgent: req.get("User-Agent")
      })
    ])

    const locationData  = location.status  === "fulfilled" ? location.value  : {}
    const analysisData  = aiResult.status  === "fulfilled" ? aiResult.value  : {}

    let serviceData
    if (analysisData?.service) {
      let confidenceVal = 0
      const conf = analysisData.service.confidence
      if (typeof conf === "number") {
        confidenceVal = conf
      } else if (typeof conf === "string") {
        const lowerConf = conf.toLowerCase()
        if (lowerConf === "high") confidenceVal = 90
        else if (lowerConf === "medium") confidenceVal = 60
        else if (lowerConf === "low") confidenceVal = 30
        else {
          const parsed = parseFloat(lowerConf)
          if (!isNaN(parsed)) confidenceVal = parsed
        }
      }
      serviceData = {
        name: analysisData.service.name || "Unknown",
        confidence: confidenceVal,
        details: {}
      }
    } else {
      const rawService = detectService(req.headers, req.body, req.get("User-Agent"))
      serviceData = {
        name: rawService.service || "Unknown",
        confidence: rawService.confidence || 0,
        details: rawService.details || {}
      }
    }

    const historicalData = await Request.find({ token }).sort({ timestamp: -1 }).limit(50)
    const anomalies = detectAnomalies(req, historicalData)

    const responseTime = Date.now() - startTime

    const request = await Request.create({
      token,
      method: req.method,
      statusCode: endpoint.autoResponse ? endpoint.responseConfig.statusCode : 200,
      headers: req.headers,
      body: req.body || {},
      rawBody: JSON.stringify(req.body || {}),
      query: req.query,
      ip: clientIP,
      url: req.originalUrl,
      location: locationData,
      service: serviceData,
      analysis: {
        anomalies,
        riskLevel: analysisData?.security?.riskLevel || "low",
        pattern: analyzeRequestPattern(historicalData),
        aiAnalysis: analysisData,
        securityAnalysis: analysisData?.security || {}
      },
      userAgent: req.get("User-Agent") || "",
      contentType: req.get("Content-Type") || "",
      responseTime,
      size: JSON.stringify(req.body || {}).length,
      timestamp: new Date()
    })

    // Real-time push
    const io = req.app.get("io")
    if (io) io.emit("new_webhook", request)

    // Auto respond
    if (endpoint.autoResponse) {
      const config = endpoint.responseConfig
      if (config.delay > 0)
        await new Promise(r => setTimeout(r, config.delay))

      if (config.headers?.length > 0)
        config.headers.forEach(h => { if (h.key && h.value) res.set(h.key, h.value) })

      res.set("Content-Type", config.contentType || "application/json")
      try {
        res.status(config.statusCode).json(JSON.parse(config.body))
      } catch {
        res.status(config.statusCode).send(config.body)
      }
    } else {
      res.json({ received: true, request_id: request._id, timestamp: request.timestamp })
    }
  } catch (err) {
    console.error("Receive webhook error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}
