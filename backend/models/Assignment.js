const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  subject: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // tutor who made it
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }], // which students
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
