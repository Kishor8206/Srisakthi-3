const mongoose = require("mongoose")

const uri = process.env.MONGODB_URI || "mongodb+srv://kishor:kishor%402006@messages.khjyaj7.mongodb.net/webhooks"

mongoose.connect(uri)
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.error("❌ MongoDB connection error:", err))

module.exports = mongoose