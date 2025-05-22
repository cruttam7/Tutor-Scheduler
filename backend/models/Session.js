const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'   // 🛠️ Tell Mongoose this links to User model
},

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', sessionSchema);
