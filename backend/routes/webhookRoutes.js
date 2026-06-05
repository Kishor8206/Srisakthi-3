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

router.use(protect)                                   // all routes require JWT

router.post("/create",              createWebhook)
router.get("/user",                 getUserWebhooks)  // GET /api/webhooks/user
router.delete("/:id",               deleteWebhook)
router.get("/:id/config",           getWebhookConfig)
router.put("/:id/config",           updateWebhookConfig)
router.delete("/:id/requests",      clearWebhookRequests)

module.exports = router
