// 📦 Import Core Modules

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const compression = require('compression');

// 🚀 Initialize Express App
const app = express();

// ⚡ Enable Compression Middleware
app.use(compression());

// 🛠️ Body Parser Middleware (for JSON)
app.use(bodyParser.json());

// 🗂️ Serve Static Files from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(express.json());

// 🔐 Session Configuration (for login sessions)
app.use(session({
  secret: 'groupc',  // ⚠️ Replace with a secure env-based secret!
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // ✅ Set to true in production if using HTTPS
}));

// 🌐 MongoDB Connection
mongoose.connect('mongodb://localhost:27017/your-database-name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB', err);
});

// 📚 Load Mongoose Models
const User = require('./models/User');
const Student = require('./models/Student');
const Admin = require('./models/Admin');

// Serve the admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-login.html'));
});













//new backend code by manish
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName studentDOB studentGrade courses guardianName createdAt');
    const studentList = students.map(student => ({
      name: student.studentName,
      studentDOB: student.studentDOB,
      grade: student.studentGrade,
      courses: student.courses,
      guardian: student.guardianName,
      enrollmentDate: student.createdAt
    }));
    res.status(200).json(studentList);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});















app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // Set to true if using HTTPS
}));


// 🔒 Middleware: Admin Authentication Check
const adminAuth = (req, res, next) => {
  if (req.session?.admin) {
    // ✅ Admin is authenticated
    return next();
  }

  // 🚫 Access denied
  return res.status(403).json({ message: '🚫 Access denied. Please log in as admin.' });
};

// 🧑‍💼 Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: '❌ Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: '🔐 Invalid credentials' });
    }

    // 🟢 Set session
    req.session.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email
    };

    res.status(200).json({ message: '✅ Admin login successful' });
  } catch (err) {
    console.error('⚠️ Error logging in admin:', err.message);
    res.status(500).json({ message: 'Server error during admin login' });
  }
});


// 🔓 Admin Logout
app.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: '❌ Failed to log out' });
      }
      res.status(200).json({ message: '👋 Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: '⚠️ No active session' });
  }
});

//--------------------------------------TUTOR---------------------------------------------------------------------

// 👩‍🏫 Tutor Login
app.post('/login', async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: '❌ User not found' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '🔐 Invalid credentials' });
    }

    res.status(200).json({ message: '✅ Login successful' });
  } catch (err) {
    res.status(500).json({ message: '⚠️ Error logging in' });
  }
});


//--------------------------------------STUDENT---------------------------------------------------------------------

// 🧒 Student Login
app.post('/students/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: '❌ Student not found' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: '🔐 Invalid credentials' });
    }

    // ✅ Save session before sending response
    req.session.student = {
      id: student._id,
      name: student.studentName
    };

    // 🚀 Send success response
    res.status(200).json({ message: '✅ Student login successful' });
  } catch (error) {
    res.status(500).json({ message: '⚠️ Error logging in', error: error.message });
  }
});

// 🧾 Get Admin Session Info
app.get('/admin/info', (req, res) => {
  if (req.session && req.session.admin) {
    res.status(200).json({
      username: req.session.admin.username,
      email: req.session.admin.email
    });
  } else {
    res.status(403).json({ message: '🚫 Not authorized' });
  }
});

// 🧑‍💼 Admin Dashboard (HTML Page) – Protected Route
app.get('/admin/dashboard', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-dashboard.html'));
});

// 🧾 Admin Dashboard (JSON Response) – Optional Data View
app.get('/admin/dashboard/info', adminAuth, (req, res) => {
  res.status(200).json({
    message: '📊 Welcome to the admin dashboard!',
    admin: req.session.admin
  });
});


// 👥 Fetch All Tutors (Users)
app.get('/admin/manage-users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, 'username email');
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// 👨‍🎓 Fetch All Students
app.get('/admin/manage-students', adminAuth, async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName studentGrade guardianEmail');
    res.status(200).json(students);
  } catch (error) {
    console.error('❌ Error fetching students:', error.message);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

// ✏️ Update Tutor Info
app.put('/admin/manage-users/:id', adminAuth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, { username, email }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    res.status(200).json({ message: 'Tutor updated successfully ✅', updatedUser });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// ✏️ Update Student Info
app.put('/admin/manage-students/:id', adminAuth, async (req, res) => {
  try {
    const { studentName, email } = req.body;
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, { studentName, email }, { new: true });

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ message: 'Student updated successfully ✅', updatedStudent });
  } catch (error) {
    console.error('❌ Error updating student:', error);
    res.status(500).json({ message: 'Error updating student' });
  }
});

// 🗑️ Delete Tutor
app.delete('/admin/manage-users/:id', adminAuth, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    res.status(200).json({ message: 'Tutor deleted successfully 🗑️' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// 🗑️ Delete Student
app.delete('/admin/manage-students/:id', adminAuth, async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ message: 'Student deleted successfully 🗑️' });
  } catch (error) {
    console.error('❌ Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student' });
  }
});

// 📊 Admin Dashboard Quick Stats
app.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    // 👩‍🏫 Total Tutors (from User collection)
    const totalTutors = await User.countDocuments({ role: 'tutor' });

    // 🎓 Total Students (from Student collection)
    const totalStudents = await Student.countDocuments({});

    // 🕒 Recent Registrations (mix of users + students)
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3).select('username role email');
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(2).select('studentName email');

    const recentRegistrations = [...recentUsers, ...recentStudents];

    res.status(200).json({
      totalTutors,
      totalStudents,
      recentRegistrations
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// 📝 Admin – Register a Tutor (with auto password + email)
app.post('/admin/register-tutor', adminAuth, async (req, res) => {
  const {
    firstName, lastName, email, phone, address, subjects, qualifications,
    experience, bio, rate, username
  } = req.body;

  try {
    // 🔍 Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: '⚠️ Email or username already registered.' });
    }

    // 🔑 Generate & hash temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 🔐 Create reset token for password change
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    // 📥 Create and save tutor
    const tutor = new User({
      username,
      email,
      password: hashedPassword,
      role: 'tutor',
      firstName,
      lastName,
      phone,
      address,
      subjects: subjects.split(',').map(s => s.trim()),
      qualifications,
      experience,
      bio,
      rate,
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    await tutor.save();

    // 📧 Send welcome email with password & reset link
    const resetLink = `http://localhost:3000/change-password-tutor.html?token=${resetToken}`;

    const mailOptions = {
      from: 'your-email@gmail.com',
      to: tutor.email,
      subject: '👋 Welcome to the Platform!',
      text: `Hello ${tutor.firstName},\n\nYou've been registered as a tutor.\n\nLogin credentials:\nUsername: ${tutor.username}\nPassword: ${tempPassword}\n\nChange your password here (valid 15 mins):\n${resetLink}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('❌ Error sending email:', error);
        return res.status(500).json({ message: 'Error sending email' });
      }
      console.log('📤 Email sent:', info.response);
    });

    res.status(201).json({ message: '✅ Tutor registered. Email sent with credentials.' });

  } catch (err) {
    console.error('❌ Error registering tutor:', err.message);
    res.status(500).json({ message: 'Error registering tutor' });
  }
});

// 🔐 Admin Forgot Password
app.post('/admin/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = resetExpires;
    await admin.save();

    const resetLink = `http://localhost:3000/admin/admin-reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: 'your-email@example.com',
      to: admin.email,
      subject: '🔁 Password Reset Request',
      text: `Click to reset your password:\n${resetLink}\n\nLink is valid for 15 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Email error:', error);
        return res.status(500).json({ message: 'Error sending reset email.' });
      }
    });

    res.status(200).json({ message: '📧 Reset email sent' });

  } catch (error) {
    console.error('❌ Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔄 Reset Password (Admin)
app.post('/admin/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ message: '⛔ Invalid or expired token' });
    }

    const strongPass = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
    if (!strongPass.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must have uppercase, number, special char & 8+ length.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;

    await admin.save();

    res.status(200).json({ message: '✅ Password has been reset successfully.' });
  } catch (error) {
    console.error('❌ Error during reset:', error.message);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// 📩 Forgot Password (Tutor)
app.post('/tutors/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const tutor = await User.findOne({ email, role: 'tutor' });
    if (!tutor) return res.status(400).json({ message: 'Tutor not found.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

    tutor.resetPasswordToken = resetToken;
    tutor.resetPasswordExpires = resetExpires;
    await tutor.save();

    const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: tutor.email,
      subject: '🔁 Password Reset',
      text: `Click to reset your password:\n\n${resetLink}\n\nLink expires in 15 minutes.`
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).json({ message: 'Email sending failed' });
    });

    res.status(200).json({ message: 'Reset email sent successfully 📧' });

  } catch (error) {
    console.error('❌ Tutor forgot password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔄 Reset Password (Tutor using token)
app.post('/tutors/reset-password-with-token/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const tutor = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!tutor) {
      return res.status(400).json({ message: '⛔ Token expired or invalid' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    tutor.password = hashedPassword;
    tutor.resetPasswordToken = undefined;
    tutor.resetPasswordExpires = undefined;

    await tutor.save();
    res.status(200).json({ message: '✅ Password reset successful' });

  } catch (error) {
    console.error('❌ Error resetting tutor password:', error.message);
    res.status(500).json({ message: 'Internal error' });
  }
});


// Define the /tutors/create-student route for tutors to create student accounts
app.post('/tutors/create-student', async (req, res) => {
  const {
    username, email, studentName, studentDOB, studentGrade, studentSchool,
    guardianName, guardianEmail, guardianPhone, relationship, courses
  } = req.body;
  try {
    // Validate required fields
    if (!username || !email || !password || !studentName || !studentDOB || !studentGrade || 
      !studentSchool || !guardianName || !guardianEmail || !guardianPhone || !relationship) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if the student username or email already exists
    const existingStudent = await Student.findOne({ $or: [{ email }, { username }] });
    if (existingStudent) {
      return res.status(400).json({ message: 'Username or email already in use by another student' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const student = new Student({
      username,
      email,
      password: hashedPassword,
      studentName,
      studentDOB,
      studentGrade,
      studentSchool,
      guardianName,
      guardianEmail,
      guardianPhone,
      relationship,
      courses,
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
      firstLogin: true
    });

    // Save the student
    await student.save();
    res.status(201).json({ message: 'Student account created successfully' });
  } catch (error) {
    console.error('Error creating student account:', error.message);
    res.status(500).json({ message: 'Error creating student account', error: error.message });
  }
});





//added upto here































// 📅 Create New Event
app.post('/api/events', async (req, res) => {
  const { title, date, time, location, classType, description, students } = req.body;

  try {
    const event = new CalendarEvent({
      title,
      date,
      time,
      location,
      classType,
      description,
      students: students.map(id => new mongoose.Types.ObjectId(id)),
      createdBy: req.session?.tutorId || "66013450e5d404b6c2b9861a"
    });

    await event.save();
    res.status(201).json({ message: '📅 Event created', event });
  } catch (error) {
    console.error('❌ Event creation error:', error.message);
    res.status(500).json({ message: '❌ Failed to create event', error: error.message });
  }
});


// 📆 Get Tomorrow's Events
app.get('/api/events/tomorrow', async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));
    const tomorrow = new Date(start);
    tomorrow.setDate(start.getDate() + 1);

    const events = await CalendarEvent.find({
      date: { $gte: tomorrow, $lte: end }
    });

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: '❌ Error fetching events', error: error.message });
  }
});

// 📆 Get All Calendar Events (for calendar display)
app.get('/api/events', async (req, res) => {
  try {
    const events = await CalendarEvent.find();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: '❌ Error fetching all events', error: error.message });
  }
});

//🔎 Get a Single Event by ID
app.get('/api/events', async (req, res) => {
  try {
    const events = await CalendarEvent.find().populate('students', 'studentName _id');

    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error fetching events:', error.message);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});



//✏️ Update an Event
app.put('/api/events/:id', async (req, res) => {
  try {
    const updatedEvent = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedEvent) {
      return res.status(404).json({ message: '❌ Event not found' });
    }
    res.status(200).json({ message: '✅ Event updated successfully', updatedEvent });
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to update event', error: error.message });
  }
});

//🗑️ Delete an Event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const deletedEvent = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
      return res.status(404).json({ message: '❌ Event not found' });
    }
    res.status(200).json({ message: '🗑️ Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to delete event', error: error.message });
  }
});

//  ✅ Fix: Add student API route (open for tutors)
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName _id');
    res.status(200).json(students);
  } catch (error) {
    console.error('❌ Error fetching students:', error.message);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("students");
    if (!event) return res.status(404).json({ message: "❌ Event not found" });

    res.json({
      "📝 Title": event.title,
      "📅 Date": event.date,
      "⏰ Time": event.time,
      "🏫 Location": event.location,
      "📚 Subject": event.classType,
      "🧾 Description": event.description || "No description provided",
      "👨‍🎓 Students": event.students.map(s => s.studentName || s.name),
      "🆔 ID": event._id
    });
  } catch (err) {
    res.status(500).json({
      message: "❌ Failed to fetch event",
      error: err.message
    });
  }
});


// 📡 API to fetch student dashboard data
app.get('/api/student/dashboard', async (req, res) => {
  const studentId = req.session?.student?.id;

  if (!studentId) {
    return res.status(401).json({ message: '🚫 Unauthorized' });
  }

  try {
    // 🎓 Fetch student info (except password)
    const student = await Student.findById(studentId).select('-password');

    // 🗓️ Fetch upcoming events (limit to 5)
    const events = await CalendarEvent.find({ students: studentId })
      .sort({ date: 1 })
      .limit(5);

    // ⭐ Return student info + upcoming events + stars (you can customize this!)
    res.json({
      student,
      events,
      stars: 12  // 🚀 You can later track stars in DB
    });
  } catch (err) {
    console.error('❌ Dashboard fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// 🔚 Fallback Route – Always return index.html if nothing matches
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});


// 🧒 Student-Specific Events
app.get('/api/calendar/student-events/:studentId', async (req, res) => {
  try {
    const events = await CalendarEvent.find({ students: req.params.studentId }).populate('tutor');
    res.json(events);
  } catch (error) {
    console.error('❌ Student calendar error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//🎓 Student Dashboard Info (Mocked)
// 🎓 Mocked Student Details API
app.get('/api/student/details', async (req, res) => {
  try {
    res.json({
      name: "John Doe",
      activities: ["Math", "Science", "History"]
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching student details" });
  }
});



// 🧾 Pages & Fallbacks
// 📝 Serve Tutor Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
});

// 🧾 Admin Register Tutor Page
app.get('/admin/register-tutor', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});

// 🔚 Fallback Route – Always return index.html if nothing matches
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});












//working
// app.post('/api/attendance/submit', async (req, res) => {
//   try {
//     const { records } = req.body;

//     if (!records || !Array.isArray(records)) {
//       return res.status(400).json({ message: 'Invalid attendance data' });
//     }

//     const newEntry = new Attendance({ records });
//     await newEntry.save();

//     res.status(201).json({ message: 'Attendance saved successfully' });
//   } catch (error) {
//     console.error('Error saving attendance:', error.message);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });












// Route to fetch student usernames and their courses

const Attendance = require('./models/Attendance');

app.post('/api/attendance/submit', async (req, res) => {
  try {
    const { records, week } = req.body;

    if (!week || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Invalid attendance data or missing week' });
    }

    const newAttendance = new Attendance({ week, records });
    await newAttendance.save();

    res.status(201).json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error('Attendance Save Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/// fo rthe view records
// // Route to fetch attendance records with filters
// app.get('/api/attendance/records', async (req, res, next) => {
//   try {
//     const { studentName, date, course } = req.query;
//     const query = {};

//     if (studentName) query['records.studentName'] = studentName;
//     if (course) query['records.course'] = course;
//     if (date) {
//       const parsedDate = new Date(date);
//       parsedDate.setHours(0, 0, 0, 0);
//       const nextDay = new Date(parsedDate);
//       nextDay.setDate(parsedDate.getDate() + 7);
//       query.date = { $gte: parsedDate, $lt: nextDay };
//     }

//     const records = await Attendance.find(query);
//     res.status(200).json(records);
//   } catch (error) {
//     next(error); // Pass error to the error handler
//   }
// });



//🚀 Start the Server
// 🚀 Launch Server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
