class OpenAIAnalyzer {
  constructor() {}

  async analyzeWebhook(requestData = {}) {
    const { headers = {}, body = {}, method = 'GET', ip = 'unknown' } = requestData

    // Lightweight analysis fallback when OpenAI isn't configured
    const service = this.detectServiceFromHeaders(headers) || 'Unknown'

    const security = {
      riskLevel: 'medium',
      vulnerabilities: [],
      recommendations: [],
      overallScore: 50
    }

    const calculatedMetrics = {
      securityScore: security.overallScore
    }

    return {
      service: { name: service, confidence: 'low' },
      security,
      calculatedMetrics,
      eventType: (body && (body.event || body.type)) || 'unknown',
      business: { value: 'low' },
      automation: { potential: 'low' }
    }
  }

  detectServiceFromHeaders(headers = {}) {
    const h = Object.keys(headers).map(k => k.toLowerCase())
    if (h.includes('stripe-signature') || h.includes('stripe-signature'.toLowerCase())) return 'Stripe'
    if (h.includes('x-github-event')) return 'GitHub'
    if (h.includes('x-slack-signature') || h.includes('x-slack-request-timestamp')) return 'Slack'
    if (h.includes('x-razorpay-signature')) return 'Razorpay'
    if (h.includes('paypal-auth-algo')) return 'PayPal'
    if (h.includes('x-shopify-shop-domain')) return 'Shopify'
    return 'Unknown'
  }
}

module.exports = OpenAIAnalyzer
