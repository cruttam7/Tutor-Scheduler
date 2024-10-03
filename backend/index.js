// Import necessary modules at the top
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');

// Initialize the express app
const app = express();

// Middleware to serve static files from the 'frontend/public' folder
app.use(express.static(path.join(__dirname, '../frontend/public')));



// Middleware setup to parse JSON request bodies
app.use(bodyParser.json());

// Add session middleware to the app (MUST be before routes)
app.use(session({
  secret: 'groupc',  // Use a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/your-database-name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.log('Failed to connect to MongoDB', err);
});

// Import the Student, User, and Admin models
const User = require('./models/User');
const Student = require('./models/Student');
const Admin = require('./models/Admin');

// Serve the admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-login.html'));
});


app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

// Admin login route
app.post('/admin/login', async (req, res) => {
  try {
      const email = req.body.email.toLowerCase();  // Convert email to lowercase
      const password = req.body.password;

      // Check if the admin exists with the normalized email
      const admin = await Admin.findOne({ email });
      if (!admin) {
          return res.status(400).json({ message: 'Admin not found' });
      }

      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      // If login is successful, create a session for the admin
      req.session.admin = {
          id: admin._id,
          username: admin.username,
          email: admin.email
      };

      res.status(200).json({ message: 'Admin login successful' });
  } catch (err) {
      console.error('Error logging in admin:', err.message);
      res.status(500).json({ message: 'Error logging in admin' });
  }
});

    
// Middleware to protect admin routes
const adminAuth = (req, res, next) => {
  if (req.session && req.session.admin) {
    // Admin is authenticated
    next();
  } else {
    // Admin is not authenticated
    res.status(403).json({ message: 'Access denied. Please log in as admin.' });
  }
};

app.use(session({
  secret: 'groupc',  // Replace with a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }  // Set to true if using HTTPS
}));

// Serve the admin dashboard (protected route)
app.get('/admin/dashboard', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-dashboard.html'));
});


// Admin dashboard route (protected)
app.get('/admin/dashboard', adminAuth, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the admin dashboard!',
    admin: req.session.admin  // Send admin info in the response
  });
});
// Fetch all users (for admin management)
app.get('/admin/manage-users', adminAuth, async (req, res) => {
  try {
      const users = await User.find({}, 'username email');  // Fetch all users, only return username and email
      res.status(200).json(users);
  } catch (error) {
      console.error('Error fetching users:', error.message);
      res.status(500).json({ message: 'Error fetching users' });
  }
});

// Fetch all students (for admin management)
app.get('/admin/manage-students', adminAuth, async (req, res) => {
  try {
      const students = await Student.find({}, 'studentName studentGrade guardianEmail');  // Fetch student info
      res.status(200).json(students);
  } catch (error) {
      console.error('Error fetching students:', error.message);
      res.status(500).json({ message: 'Error fetching students' });
  }
});

// Edit a user (tutor)
app.put('/admin/manage-users/:id', async (req, res) => {
  try {
    const { username, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.params.id, { username, email }, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Edit a student
app.put('/admin/manage-students/:id', async (req, res) => {
  try {
    const { studentName, email } = req.body;
    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, { studentName, email }, { new: true });

    if (!updatedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ message: 'Student updated successfully', updatedStudent });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Error updating student' });
  }
});

// Delete a user (tutor)
app.delete('/admin/manage-users/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Delete a student
app.delete('/admin/manage-students/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student' });
  }
});


app.post('/logout', (req, res) => {
  if (req.session) {
    // If session exists, destroy it
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to log out.' });
      }
      res.status(200).json({ message: 'Admin logged out successfully' });
    });
  } else {
    // No session found
    res.status(400).json({ message: 'No active session to log out from.' });
  }
});

// Route to register a new tutor (admin only)
app.post('/admin/register-tutor', adminAuth, async (req, res) => {
  const {
      firstName, lastName, email, phone, address, subjects, qualifications,
      experience, bio, rate, username, password
  } = req.body;

  try {
      // Check if the email or username already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
          return res.status(400).json({ message: 'Email or username already registered.' });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new tutor (role: 'tutor')
      const tutor = new User({
          username,
          email,
          password: hashedPassword,
          role: 'tutor',  // Mark this user as a tutor
          firstName,
          lastName,
          phone,
          address,
          subjects: subjects.split(',').map(subject => subject.trim()),  // Convert subjects to array
          qualifications,
          experience,
          bio,
          rate
      });

      // Save the tutor to the database
      await tutor.save();

      res.status(201).json({ message: 'Tutor registered successfully' });
  } catch (err) {
      console.error('Error registering tutor:', err.message);
      res.status(500).json({ message: 'Error registering tutor' });
  }
});
// Route to get quick stats for the admin dashboard
app.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        // Get the total number of tutors and students
        const totalTutors = await User.countDocuments({ role: 'tutor' });
        const totalStudents = await User.countDocuments({ role: 'student' });

        // Get the 5 most recent user registrations
        const recentRegistrations = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('username role email');

        res.status(200).json({
            totalTutors,
            totalStudents,
            recentRegistrations
        });
    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});
// Admin information route
app.get('/admin/info', (req, res) => {
  if (req.session && req.session.admin) {
    res.status(200).json({
      username: req.session.admin.username,
      email: req.session.admin.email
    });
  } else {
    res.status(403).json({ message: 'Not authorized' });
  }
});



app.get('/admin/stats', adminAuth, async (req, res) => {
  try {
      console.log('Stats route hit');  // Log when this route is called
      const totalTutors = await User.countDocuments({ role: 'tutor' });
      const totalStudents = await User.countDocuments({ role: 'student' });

      const recentRegistrations = await User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('username role email');

      res.status(200).json({
          totalTutors,
          totalStudents,
          recentRegistrations
      });
  } catch (error) {
      console.error('Error fetching stats:', error.message);
      res.status(500).json({ message: 'Error fetching stats' });
  }
});


// Define the /login route for tutor login
app.post('/login', async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Define the /tutors/create-student route for tutors to create student accounts
app.post('/tutors/create-student', async (req, res) => {
  const {
    username, email, password, studentName, studentDOB, studentGrade, studentSchool,
    guardianName, guardianEmail, guardianPhone, relationship
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
      relationship
    });

    // Save the student
    await student.save();
    res.status(201).json({ message: 'Student account created successfully' });
  } catch (error) {
    console.error('Error creating student account:', error.message);
    res.status(500).json({ message: 'Error creating student account', error: error.message });
  }
});

// Add route to fetch student details for the dashboard
app.get('/api/student/details', async (req, res) => {
  try {
    res.json({
      name: "John Doe",
      activities: ["Math", "Science", "History"]
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching student details", error: error.message });
  }
});
// Middleware to serve static files from the frontend/public directory
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Serve the tutor registration page for the admin
app.get('/admin/register-tutor', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/register.html'));
});



app.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    // Count tutors from the 'users' collection
    const totalTutors = await User.countDocuments({ role: 'tutor' });
    console.log('Total tutors:', totalTutors);  // Log tutor count

    // Count students from the 'students' collection
    const totalStudents = await Student.countDocuments({});
    console.log('Total students (students collection):', totalStudents);  // Log student count
    
    // Fetch recent user and student registrations
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3).select('username role email');
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(2).select('studentName email');
    console.log('Recent students:', recentStudents);  // Log fetched students

    const recentRegistrations = [...recentUsers, ...recentStudents];
    console.log('Combined recent registrations:', recentRegistrations);  // Log combined results

    // Send the stats to the frontend
    res.status(200).json({
      totalTutors,
      totalStudents,
      recentRegistrations
    });
  } catch (error) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});



// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Failed to log out.');
    }
    res.redirect('/');
  });
});

// Student login route
app.post('/students/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: 'Student not found' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Simple dashboard route for tutors
app.get('/dashboard', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
});

// Fallback route to serve index.html if no other route matches
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
