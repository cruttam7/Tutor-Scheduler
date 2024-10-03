const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
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
}, { timestamps: true });  // Add createdAt and updatedAt fields automatically

const User = mongoose.model('User', userSchema);

module.exports = User;
