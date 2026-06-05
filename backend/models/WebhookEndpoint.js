const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Response configuration
  responseConfig: {
    statusCode: {
      type: Number,
      default: 200,
      min: 100,
      max: 599
    },
    headers: [{
      key: String,
      value: String
    }],
    body: {
      type: String,
      default: '{"message": "Webhook received successfully"}'
    },
    contentType: {
      type: String,
      default: 'application/json'
    },
    delay: {
      type: Number,
      default: 0,
      min: 0,
      max: 10000 // Max 10 seconds delay
    }
  },
  // Endpoint settings
  isActive: {
    type: Boolean,
    default: true
  },
  autoResponse: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model("WebhookEndpoint", Schema)