const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderEmail: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  subject: String,
  body: String,
  attachment: String,
  read: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
