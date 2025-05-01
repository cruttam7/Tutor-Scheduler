const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  studentName: { type: String, required: true },
  studentDOB: { type: Date, required: true },
  studentGrade: { type: String, required: true },
  studentSchool: { type: String, required: true },

  courses: [{ type: String }], // ✅ Courses like "Math", "English"

  // ✅ Link to the tutor
  assignedTutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTutorName: { type: String }, // ✅ Added for display purposes

  guardianName: { type: String, required: true },
  guardianEmail: { type: String, required: true },
  guardianPhone: { type: String, required: true },
  relationship: { type: String, required: true },

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  firstLogin: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema, 'students');
