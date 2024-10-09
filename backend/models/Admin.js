const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },  // Default role as 'admin'
  createdAt: { type: Date, default: Date.now },

  // Add resetPasswordToken and resetPasswordExpires for password reset functionality
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
