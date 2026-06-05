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

router.get("/user",                getUserRequests)
router.get("/by-token/:token",     getRequestsByToken)
router.get("/detail/:id",          getRequestById)
router.post("/analyze/:id",        analyzeRequest)
router.post("/security-scan/:id",  securityScan)
router.delete("/:id",              deleteRequest)

module.exports = router
