const express     = require("express")
const router      = express.Router()
const { protect } = require("../middleware/authMiddleware")
const {
  createWebhook,
  getUserWebhooks,
  deleteWebhook,
  updateWebhookConfig,
  getWebhookConfig,
  clearWebhookRequests
} = require("../controllers/webhookController")

router.use(protect)

// Specific static routes FIRST — before any /:id patterns
router.post("/create",           createWebhook)
router.get("/user",              getUserWebhooks)

// Then parameterised routes — more specific before less specific
router.delete("/:id/requests",   clearWebhookRequests)   // MUST be before /:id
router.get("/:id/config",        getWebhookConfig)
router.put("/:id/config",        updateWebhookConfig)
router.delete("/:id",            deleteWebhook)

module.exports = router
