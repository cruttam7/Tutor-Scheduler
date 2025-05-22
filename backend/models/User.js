const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
 email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'tutor' },  // Role for tutors/students/admins
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  address: { type: String },
  subjects: { type: [String] },  // Array of subjects
  qualifications: { type: String },
  experience: { type: Number },  // Years of experience
  bio: { type: String },
  rate: { type: Number },  // Hourly rate
  resetPasswordToken: { type: String },  // Token for password reset
  resetPasswordExpires: { type: Date }, 
  
  lastLogin: Date // ⬅️ Used for active users

  
  
  
  
  
  
  // Expiration time for the reset token
}, { timestamps: true });  // Automatically add createdAt and updatedAt

const User = mongoose.model('User', userSchema);

module.exports = User;
