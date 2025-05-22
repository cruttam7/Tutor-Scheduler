const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  role: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LoginEvent', loginEventSchema);
