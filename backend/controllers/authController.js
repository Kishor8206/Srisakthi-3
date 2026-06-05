const User  = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt    = require("jsonwebtoken")

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "dev-secret-change-in-prod", {
    expiresIn: "7d"
  })

exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" })

    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" })

    const existing = await User.findOne({ email })
    if (existing)
      return res.status(400).json({ error: "An account with this email already exists" })

    const hash = await bcrypt.hash(password, 12)
    const user = await User.create({ email, password: hash, name: name || "" })

    const token = signToken(user._id)

    res.status(201).json({
      message: "Account created successfully",
      token,
      userId: user._id,
      email:  user.email,
      name:   user.name,
      plan:   user.plan
    })
  } catch (err) {
    console.error("Signup error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" })

    const user = await User.findOne({ email })
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" })

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    const token = signToken(user._id)

    res.json({
      message: "Login successful",
      token,
      userId: user._id,
      email:  user.email,
      name:   user.name,
      plan:   user.plan
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")
    if (!user) return res.status(404).json({ error: "User not found" })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: "Internal server error" })
  }
}
