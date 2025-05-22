const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const calendarEventSchema = new Schema({
  title: String,
  date: String,
  time: String,
  location: String,
  description: String,
  classType: String,
  itemsToBring: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // or 'Tutor' if you have separate schema
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }]
}, { timestamps: true });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
