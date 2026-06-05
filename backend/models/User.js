const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    default: ""
  },
  plan: {
    type: String,
    enum: ["free", "pro", "enterprise"],
    default: "free"
  },
  webhookLimit: {
    type: Number,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

module.exports = mongoose.model("User", UserSchema)
