const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },
    subject: String, // ✅ Add this to save which subject it was for

  answerText: String,
  fileUrl: String,
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
