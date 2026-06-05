const jwt = require("jsonwebtoken")

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Authentication required. Please login." })

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-in-prod")
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "Session expired. Please login again." })
    return res.status(401).json({ error: "Invalid authentication token." })
  }
}

// Optional auth — attaches user if token present, but doesn't block
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1]
      req.user = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-in-prod")
    } catch (_) {
      // ignore invalid token in optional auth
    }
  }
  next()
}

module.exports = { protect, optionalAuth }
