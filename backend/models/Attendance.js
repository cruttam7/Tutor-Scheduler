const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  week: {
    type: String, // Format: "YYYY-WW" from input[type="week"]
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  submittedBy: { // ✅ NEW: Track who submitted
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  records: [
    {
      studentName: { type: String, required: true },
      course: { type: String, required: true },
      status: {
        type: String,
        enum: ['Present', 'Absent'],
        required: true
      }
    }
  ]
});

module.exports = mongoose.model('Attendance', attendanceSchema);
