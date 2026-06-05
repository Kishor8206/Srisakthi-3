const express     = require("express")
const router      = express.Router()
const { protect } = require("../middleware/authMiddleware")
const {
  getUserRequests,
  getRequestsByToken,
  getRequestById,
  analyzeRequest,
  securityScan,
  deleteRequest
} = require("../controllers/requestController")

router.use(protect)

// Static routes first
router.get("/user",                  getUserRequests)
router.get("/by-token/:token",       getRequestsByToken)
router.get("/detail/:id",            getRequestById)

// Action routes
router.post("/analyze/:id",          analyzeRequest)
router.post("/security-scan/:id",    securityScan)

// Delete last — most generic
router.delete("/:id",                deleteRequest)

module.exports = router
