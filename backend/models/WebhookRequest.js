const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number,
    default: 200
  },
  headers: {
    type: Object,
    default: {}
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  rawBody: {
    type: String,
    default: ""
  },
  query: {
    type: Object,
    default: {}
  },
  ip: {
    type: String,
    default: ""
  },
  url: {
    type: String,
    default: ""
  },
  location: {
    country:  { type: String, default: "Unknown" },
    city:     { type: String, default: "Unknown" },
    region:   { type: String, default: "Unknown" },
    latitude: { type: Number, default: 0 },
    longitude:{ type: Number, default: 0 },
    isp:      { type: String, default: "Unknown" },
    timezone: { type: String, default: "Unknown" }
  },
  service: {
    name:       { type: String, default: "Unknown" },
    confidence: { type: Number, default: 0 },
    details:    { type: Object, default: {} }
  },
  analysis: {
    anomalies:        { type: Array, default: [] },
    riskLevel:        { type: String, default: "low" },
    pattern:          { type: Object, default: {} },
    aiAnalysis:       { type: Object, default: {} },
    securityAnalysis: { type: Object, default: {} },
    aiServiceDetection: { type: Object, default: {} }
  },
  userAgent:   { type: String, default: "" },
  contentType: { type: String, default: "" },
  responseTime:{ type: Number, default: 0 },
  size:        { type: Number, default: 0 },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
})

Schema.index({ token: 1, timestamp: -1 })

module.exports = mongoose.model("WebhookRequest", Schema)
