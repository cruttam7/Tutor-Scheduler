// //  ✅ Fix: Add student API route (open for tutors)
// app.get('/api/students', async (req, res) => {
//   try {
//     const students = await Student.find({}, 'studentName _id');
//     res.status(200).json(students);
//   } catch (error) {
//     console.error('❌ Error fetching students:', error.message);
//     res.status(500).json({ message: 'Error fetching students' });
//   }
// });

// app.get('/api/events/:id', async (req, res) => {
//   try {
//     const event = await Event.findById(req.params.id).populate("students");
//     if (!event) return res.status(404).json({ message: "❌ Event not found" });

//     res.json({
//       "📝 Title": event.title,
//       "📅 Date": event.date,
//       "⏰ Time": event.time,
//       "🏫 Location": event.location,
//       "📚 Subject": event.classType,
//       "🧾 Description": event.description || "No description provided",
//       "👨‍🎓 Students": event.students.map(s => s.studentName || s.name),
//       "🆔 ID": event._id
//     });
//   } catch (err) {
//     res.status(500).json({
//       message: "❌ Failed to fetch event",
//       error: err.message
//     });
//   }
// });


// // 📡 API to fetch student dashboard data
// app.get('/api/student/dashboard', async (req, res) => {
//   const studentId = req.session?.student?.id;

//   if (!studentId) {
//     return res.status(401).json({ message: '🚫 Unauthorized' });
//   }

//   try {
//     // 🎓 Fetch student info (except password)
//     const student = await Student.findById(studentId).select('-password');

//     // 🗓️ Fetch upcoming events (limit to 5)
//     const events = await CalendarEvent.find({ students: studentId })
//       .sort({ date: 1 })
//       .limit(5);

//     // ⭐ Return student info + upcoming events + stars (you can customize this!)
//     res.json({
//       student,
//       events,
//       stars: 12  // 🚀 You can later track stars in DB
//     });
//   } catch (err) {
//     console.error('❌ Dashboard fetch error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// // 🔚 Fallback Route – Always return index.html if nothing matches
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
// });


// // 🧒 Student-Specific Events
// app.get('/api/calendar/student-events/:studentId', async (req, res) => {
//   try {
//     const events = await CalendarEvent.find({ students: req.params.studentId }).populate('tutor');
//     res.json(events);
//   } catch (error) {
//     console.error('❌ Student calendar error:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });

// //🎓 Student Dashboard Info (Mocked)
// // 🎓 Mocked Student Details API
// app.get('/api/student/details', async (req, res) => {
//   try {
//     res.json({
//       name: "John Doe",
//       activities: ["Math", "Science", "History"]
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching student details" });
//   }
// });
