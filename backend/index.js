// Import necessary modules at the top
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const compression = require('compression');

const CalendarEvent = require('./models/CalendarEvent');
const multer = require('multer');

// 📁 Configure where files are stored
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 📁 Your upload folder (must exist or create it)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });


// Initialize the express app
const app = express();


// ⚡ Enable Compression Middleware
app.use(compression());


// Middleware to serve static files from the 'frontend/public' folder
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



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
const Course = require('./models/Course');
const Assignment = require('./models/Assignment');
const Grade = require('./models/Grade');
const Submission = require('./models/Submission');


// Replace with a valid teacher's ObjectId if available
const seedCourses = async () => {
  const existing = await Course.find({});
  if (existing.length === 0) {
    const courses = ['English', 'Math', 'Science'];
    for (const name of courses) {
      await new Course({
        name,
        description: `${name} course`,
        teacherId: '643e4a1234567890abcde123' // replace with real ObjectId
      }).save();
    }
    console.log('Seeded default courses');
  }
};


// Serve the admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-login.html'));
});









// new and updated  1. Basic student list (for Select2 dropdowns)
app.get('/api/students/min', async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName _id');
    res.status(200).json(students); // Example: [{ _id: '123', studentName: 'John Doe' }]
  } catch (error) {
    console.error('❌ Error fetching minimal student list:', error.message);
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});



//new backend code by manish
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName studentGrade courses guardianName guardianEmail guardianPhone createdAt');
    const studentList = students.map(student => ({
      name: student.studentName,
      grade: student.studentGrade,
      courses: student.courses,
      guardianName: student.guardianName ,
      guardianEmail: student.guardianEmail ,
      guardianPhone: student.guardianPhone ,
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
        experience, bio, rate, username
    } = req.body;

    try {
        // Check if the email or username is already registered
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or username already registered.' });
        }

        // Auto-generate a random password
        const generatedPassword = crypto.randomBytes(6).toString('hex');  // Generates a 12-character password

        // Hash the generated password before saving to the database
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Create a secure token and expiration time for the password reset
        const resetToken = crypto.randomBytes(32).toString('hex');  // Generate a 32-byte token
        const resetExpires = Date.now() + 15 * 60 * 1000;  // Set the expiration time for 1 minute from now (can adjust)

        // Create new tutor (role: 'tutor')
        const tutor = new User({
            username,
            email,
            password: hashedPassword,  // Store the hashed password
            role: 'tutor',
            firstName,
            lastName,
            phone,
            address,
            subjects: subjects.split(',').map(subject => subject.trim()),  // Convert the subjects into an array
            qualifications,
            experience,
            bio,
            rate,
            resetPasswordToken: resetToken,  // Store the reset token
            resetPasswordExpires: resetExpires  // Store the expiration time
        });

        // Save the tutor to the database
        await tutor.save();

        // Send email to the tutor with the auto-generated password and link to change the password
        const changePasswordLink = `http://localhost:3000/change-password-tutor.html?token=${resetToken}`;

        const mailOptions = {
            from: 'your-email@gmail.com',
            to: tutor.email,
            subject: 'Welcome! Your Account Details',
            text: `Hello ${tutor.firstName},\n\nYou have been registered as a tutor on our platform.\n\n` +
                `Here are your account details:\n\n` +
                `Username: ${tutor.username}\n` +
                `Temporary Password: ${generatedPassword}\n\n` +  // Send the auto-generated password in the email
                `Please use the following link to change your password (valid for 1 minute):\n\n${changePasswordLink}\n\n` +
                `You will be required to enter your current password (the temporary password provided above), and then choose a new password.\n\n` +
                `Thank you for joining us!`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
                return res.status(500).json({ message: 'Error sending email' });
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        // Admin does not see the password, so only a success message is returned
        res.status(201).json({ message: 'Tutor registered successfully. An email has been sent with account details.' });

    } catch (err) {
        console.error('Error registering tutor:', err.message);
        res.status(500).json({ message: 'Error registering tutor' });
    }
});



 app.post('/tutors/change-password/:token', async (req, res) => {
  try {
    // Destructure the current and new passwords from the request body
    const { currentPassword, newPassword } = req.body;

    // Find the tutor by reset token and ensure the token is still valid (not expired)
    const tutor = await User.findOne({
      resetPasswordToken: req.params.token,  // Use the token instead of the ID
      resetPasswordExpires: { $gt: Date.now() }  // Ensure the token hasn't expired
    });

    if (!tutor) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    // Validate the current password
    const isMatch = await bcrypt.compare(currentPassword, tutor.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Hash the new password and update it
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    tutor.password = hashedNewPassword;

    // Invalidate the token by clearing it and its expiration
    tutor.resetPasswordToken = undefined;
    tutor.resetPasswordExpires = undefined;

    // Save the updated tutor details
    await tutor.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error updating password:', error.message);  // Detailed error logging
    res.status(500).json({ message: 'Error updating password. Please try again later.' });
  }
});
 
   // Configure your email transporter
   const transporter = nodemailer.createTransport({
     service: 'gmail', // You can use other services like SendGrid, Outlook, etc.
     auth: {
       user: 'uttam.dhakal777@gmail.com', // Use your email
       pass: 'iuja qjii ujva wkev'   // Use your email password or App-specific password
     }
   });
   




// Route to get quick stats for the admin dashboard
app.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        // Get the total number of tutors and students
        const totalTutors = await User.countDocuments({ role: 'tutor' });
        const totalStudents = await Student.countDocuments({});
        console.log('🔍 totalStudents from DB:', totalStudents); // ADD THIS

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

// Forgot password route for Admin 
app.post('/admin/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
      // Find the admin by email
      const admin = await Admin.findOne({ email });
      if (!admin) {
          return res.status(400).json({ message: 'Admin not found.' });
      }

      // Generate a reset token and set expiration time
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = Date.now() + 15 * 60 * 1000;  // 15-minute expiration

      // Add debug logging to confirm token generation
      console.log(`Generated reset token: ${resetToken}`);
      console.log(`Token expiration time: ${new Date(resetExpires).toLocaleString()}`);

      // Update the admin with the token and expiration
      admin.resetPasswordToken = resetToken;
      admin.resetPasswordExpires = resetExpires;

      // Save the admin with the new token and expiration
      await admin.save();  // This is where the token is saved to the database

      console.log('Admin document updated with reset token and expiration.');

      // Create the reset link
      const resetLink = `http://localhost:3000/admin/admin-reset-password.html?token=${resetToken}`;

      // Send the password reset email
      const mailOptions = {
          from: 'your-email@example.com',
          to: admin.email,
          subject: 'Password Reset Request',
          text: `Hello,\n\nYou requested to reset your password. Please click the link below to reset it:\n\n${resetLink}\n\nThis link is valid for 15 minutes.`
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.log('Error sending email:', error);
              return res.status(500).json({ message: 'Error sending reset email.' });
          } else {
              console.log('Email sent: ' + info.response);
          }
      });

      res.status(200).json({ message: 'Password reset email has been sent.' });

  } catch (error) {
      console.error('Error in forgot password:', error.message);
      res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});


// Password reset route for Admin submission
app.post('/admin/reset-password/:token', async (req, res) => {
    const { token } = req.params;  // Get the token from the URL
    const { newPassword } = req.body;  // Get the new password from the body

    console.log(`Received token: ${token}`);
    console.log(`New password: ${newPassword}`);

    try {
        // Validate that the token exists and hasn't expired
        const admin = await Admin.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }  // Check if the token is still valid
        });

        if (!admin) {
            console.log('Token is invalid or expired.');
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        // Log that the admin was found and the token is valid
        console.log(`Admin found: ${admin.email}`);

        // Validate the new password strength
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            console.log('Password does not meet the strength requirements.');
            return res.status(400).json({ message: 'Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the admin's password and clear the reset token and expiration
        admin.password = hashedPassword;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpires = undefined;

        // Save the updated admin details
        await admin.save();

        console.log('Password has been successfully reset.');
        res.status(200).json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Error during password reset:', error.message);
        res.status(500).json({ message: 'An error occurred. Please try again later.' });
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

    // ✅ Store tutor info in session
    req.session.tutor = {
      id: user._id,
      username: user.username,
      email: user.email,
      subjects: user.subjects || []  // e.g., ['Math']
    };

    res.status(200).json({
      message: 'Login successful',
      tutor: req.session.tutor
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Error logging in' });
  }
});


// Email Sending Logic (backend)
app.post('/tutors/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
      const tutor = await User.findOne({ email, role: 'tutor' });
      if (!tutor) {
          return res.status(400).json({ message: 'Tutor not found.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = Date.now() + 15 * 60 * 1000; // 15-minute expiration

      tutor.resetPasswordToken = resetToken;
      tutor.resetPasswordExpires = resetExpires;
      await tutor.save();

      // Make sure this URL is properly constructed
      const resetLink = `http://localhost:3000/reset-password.html?token=${resetToken}`;

      const mailOptions = {
          from: 'your-email@gmail.com',
          to: tutor.email,
          subject: 'Password Reset Request',
          text: `Please click the link to reset your password:\n\n${resetLink}\n\nThis link is valid for 15 minutes.`
      };

      transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
              console.error('Error sending email:', error);
              return res.status(500).json({ message: 'Error sending reset email.' });
          } else {
              console.log('Email sent: ' + info.response);
          }
      });

      res.status(200).json({ message: 'Password reset email has been sent.' });

  } catch (error) {
      console.error('Error in forgot password:', error.message);
      res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});


app.post('/tutors/reset-password-with-token/:token', async (req, res) => {
  const { token } = req.params; // Token from the URL
  const { newPassword } = req.body; // New password from the request body

  try {
    // Find the tutor by reset token and check if it's still valid
    const tutor = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } // Ensure the token is not expired
    });

    if (!tutor) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    // Hash the new password and update the tutor's password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    tutor.password = hashedPassword;

    // Invalidate the token by clearing it and its expiration
    tutor.resetPasswordToken = undefined;
    tutor.resetPasswordExpires = undefined;

    // Save the updated tutor details
    await tutor.save();

    res.status(200).json({ message: 'Password has been reset successfully.' });

  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});

///////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
// 🔄 Updated by ChatGPT to assign tutor to student
app.post('/tutors/create-student', async (req, res) => {
  const {
    username, email, studentName, studentDOB, studentGrade, studentSchool,
    guardianName, guardianEmail, guardianPhone, relationship, courses
  } = req.body;

  try {
    // ✅ Prevent duplicate email or username
    const existingStudent = await Student.findOne({
      $or: [{ email }, { username }]
    });

    if (existingStudent) {
      return res.status(400).json({ message: 'Username or email is already in use.' });
    }

    // 🔐 Get tutor ID and name from session
    const tutorId = req.session?.tutor?.id;
    const tutorName = req.session?.tutor?.username;

    if (!tutorId) {
      return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
    }

    const generatedPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

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
      assignedTutorId: tutorId,        // 🔗 Linked by ID
      assignedTutorName: tutorName,    // 🧾 For display
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
      firstLogin: true
    });

    await student.save();   

    const changePasswordLink = `http://localhost:3000/admin/change-password-student.html?token=${resetToken}`;
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email || guardianEmail,
      subject: 'Welcome to the Learning Platform!',
      text: `Hello ${studentName},\n\nYour account has been created.\n\n` +
            `Username: ${username}\n` +
            `Temporary Password: ${generatedPassword}\n\n` +
            `Click the link below to change your password (valid for 15 minutes):\n${changePasswordLink}\n\n` +
            `Thanks!`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email failed:', err);
        return res.status(500).json({ message: 'Failed to send email' });
      }
      console.log('Email sent:', info.response);
      return res.status(201).json({ message: 'Student registered and email sent with temporary credentials.' });
    });

  } catch (error) {
    console.error('Error creating student:', error.message);
    return res.status(500).json({ message: 'Error creating student account' });
  }
});






app.post('/students/change-password-student/:token', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const student = await Student.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!student) {
      return res.status(400).json({ message: 'Reset token is invalid or expired.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    student.password = await bcrypt.hash(newPassword, 10);
    student.firstLogin = false;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpires = undefined;

    await student.save();
    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing student password:', err.message);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});


// 📩 Forgot Password - Student
app.post('/students/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) {
      return res.status(400).json({ message: 'Student not found.' });
    }

    // Generate token and expiration (valid for 15 mins)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

    student.resetPasswordToken = resetToken;
    student.resetPasswordExpires = resetExpires;
    await student.save();

    // Reset link (make sure your frontend page exists here)
    const resetLink = `http://localhost:3000/reset-password-student.html?token=${resetToken}`;

    // Email options
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: student.email,
      subject: 'Student Password Reset Request',
      text: `Hi ${student.name},\n\nClick the link below to reset your password. This link is valid for 15 minutes:\n\n${resetLink}\n\nIf you didn't request this, please ignore this email.`
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Error sending reset email.' });
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(200).json({ message: 'Password reset email has been sent to student.' });

  } catch (error) {
    console.error('Error in student forgot password:', error.message);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});


//added upto here































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

    // ✅ Store student session
    req.session.student = {
      id: student._id,
      email: student.email,
      username: student.username,
    };

    res.status(200).json({
      message: 'Login successful',
      student: req.session.student
    });

  } catch (error) {
    console.error('Error during student login:', error.message);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});


// Simple dashboard route for tutors
app.get('/dashboard', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '../frontend/public/dashboard.html'));
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



//EVERYTHING ABOUT THE EVENTS


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
    const events = await CalendarEvent.find().populate('students', 'studentName studentGrade');
    res.status(200).json(events); // Includes _id automatically
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
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

// uttam ✅ Fix: Add student API route (open for tutors)
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


// 🔓 Student Logout Route
app.post('/students/logout', (req, res) => {
  if (req.session?.student) {
    req.session.destroy(err => {
      if (err) {
        console.error('❌ Error during logout:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid'); // Remove session cookie
      res.status(200).json({ message: '✅ Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'No student session found' });
  }
});

// Serve Student Dashboard Properly
app.get('/students/dashboard', (req, res) => {
  if (!req.session?.student) {
    return res.redirect('/students/login'); // If not logged in, redirect to login
  }

  res.sendFile(path.join(__dirname, '../frontend/public/studentDashboard.html'));
});


// 🧒 Student-Specific Events
app.get('/api/calendar/student-events/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const events = await CalendarEvent.find({ students: studentId })
      .populate('createdBy', 'username email');

    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Student calendar error:', error.message);
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

//piechart showing // Route: GET /admin/course-distribution
// Route: GET /admin/course-distribution
app.get('/course-distribution', async (req, res) => {
  try {
    const students = await Student.find({}, 'courses');
    const subjectCount = {};

    students.forEach(student => {
      student.courses.forEach(course => {
        subjectCount[course] = (subjectCount[course] || 0) + 1;
      });
    });

    res.status(200).json(subjectCount);
  } catch (error) {
    console.error('Error getting course distribution:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 🔐 Tutors fetch only their assigned students
app.get('/tutors/my-students', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  try {
    const students = await Student.find({ assignedTutorId: tutorId })
      .select('studentName studentGrade courses assignedTutorName createdAt');

    res.status(200).json({ students });
  } catch (error) {
    console.error('Error fetching students for tutor:', error.message);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

//Secure Grade Route 

app.post('/grades', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  const { studentId, subject, score, maxScore, feedback } = req.body;

  try {
    // 🧠 Verify the student belongs to this tutor
    const student = await Student.findOne({ _id: studentId, assignedTutorId: tutorId });

    if (!student) {
      return res.status(403).json({ message: 'You cannot grade this student' });
    }

    const grade = new Grade({
      studentId,
      subject,
      score,
      maxScore,
      feedback,
      gradedBy: tutorId
    });

    await grade.save();

    res.status(201).json({ message: 'Grade submitted successfully', grade });

  } catch (error) {
    console.error('Error submitting grade:', error.message);
    res.status(500).json({ message: 'Failed to submit grade' });
  }
});


// Student View Grades Route

app.get('/students/my-grades', async (req, res) => {
  const studentId = req.session?.student?.id;

  if (!studentId) {
    return res.status(403).json({ message: 'Unauthorized: Student not logged in' });
  }

  try {
    const grades = await Grade.find({ studentId })
      .select('subject score maxScore feedback date gradedBy')
      .populate('gradedBy', 'username');

    res.status(200).json({ grades });
  } catch (err) {
    console.error('Error fetching grades for student:', err.message);
    res.status(500).json({ message: 'Failed to fetch grades' });
  }
});


//Tutor View Their Students' Grades Route
app.get('/tutors/my-grades', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  try {
    // 🧠 Find only students assigned to this tutor
    const students = await Student.find({ assignedTutorId: tutorId }).select('_id');

    const studentIds = students.map(s => s._id);

    const grades = await Grade.find({ studentId: { $in: studentIds } })
      .populate('studentId', 'studentName studentGrade')
      .select('subject score maxScore feedback date');

    res.status(200).json({ grades });
  } catch (err) {
    console.error('Error fetching tutor’s grades:', err.message);
    res.status(500).json({ message: 'Failed to fetch grades' });
  }
});

// 📋 Update an Existing Grade (Tutor Only)
app.patch('/grades/:id', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  const { subject, score, maxScore, feedback } = req.body;

  try {
    // 🧠 Find the grade
    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // 🧠 Check tutor ownership
    if (grade.gradedBy.toString() !== tutorId) {
      return res.status(403).json({ message: 'You cannot edit this grade' });
    }

    // ✅ Update fields if provided
    if (subject) grade.subject = subject;
    if (score) grade.score = score;
    if (maxScore) grade.maxScore = maxScore;
    if (feedback) grade.feedback = feedback;

    await grade.save();

    res.status(200).json({ message: 'Grade updated successfully', grade });

  } catch (error) {
    console.error('Error updating grade:', error.message);
    res.status(500).json({ message: 'Failed to update grade' });
  }
});

// 🗑️ Delete an Existing Grade (Tutor Only)
app.delete('/grades/:id', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  try {
    const grade = await Grade.findById(req.params.id);

    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // 🧠 Check tutor ownership
    if (grade.gradedBy.toString() !== tutorId) {
      return res.status(403).json({ message: 'You cannot delete this grade' });
    }

    await grade.deleteOne();

    res.status(200).json({ message: 'Grade deleted successfully' });

  } catch (error) {
    console.error('Error deleting grade:', error.message);
    res.status(500).json({ message: 'Failed to delete grade' });
  }
});


// 📥 Create Assignment (Tutor Only)

app.post('/assignments', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  const { title, description, dueDate, subject, assignedTo } = req.body;

  try {
    const assignment = new Assignment({
      title,
      description,
      dueDate,
      subject,
      assignedTo: assignedTo.map(id => new mongoose.Types.ObjectId(id)),
      createdBy: tutorId
    });

    await assignment.save();
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } catch (error) {
    console.error('❌ Assignment creation error:', error.message);
    res.status(500).json({ message: 'Failed to create assignment' });
  }
});

// 📤 Student: Get Their Own Assignments

app.get('/students/my-assignments', async (req, res) => {
  const studentId = req.session?.student?.id;

  if (!studentId) {
    return res.status(403).json({ message: 'Unauthorized: Student not logged in' });
  }

  try {
    const assignments = await Assignment.find({ assignedTo: studentId })
      .select('title description dueDate subject createdAt');

    res.status(200).json(assignments);
  } catch (error) {
    console.error('❌ Error fetching student assignments:', error.message);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

//👨‍🏫 Tutor: View Their Created Assignments
app.get('/tutors/my-assignments', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  try {
    const assignments = await Assignment.find({ createdBy: tutorId })
      .populate('assignedTo', 'studentName')
      .select('title subject dueDate createdAt');

    res.status(200).json(assignments);
  } catch (error) {
    console.error('❌ Tutor assignment fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch tutor assignments' });
  }
});

//Student: Submit Assignment
app.post('/assignments/submit-file', upload.single('file'), async (req, res) => {
  const studentId = req.session?.student?.id;

  if (!studentId) {
    return res.status(403).json({ message: 'Unauthorized: Student not logged in' });
  }

  const { assignmentId, answerText } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const alreadySubmitted = await Submission.findOne({ assignmentId, studentId });
    if (alreadySubmitted) {
      return res.status(400).json({ message: 'Already submitted' });
    }

    const submission = new Submission({
      assignmentId,
      studentId,
      answerText,
      fileUrl
    });

    await submission.save();
    res.status(201).json({ message: 'Assignment submitted successfully', file: fileUrl });
  } catch (error) {
    console.error('File submission error:', error.message);
    res.status(500).json({ message: 'Failed to submit assignment' });
  }
});



//Tutor: View All Submissions (for their assignments)

app.get('/tutors/submissions', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  try {
    const tutorAssignments = await Assignment.find({ createdBy: tutorId }).select('_id');
    const assignmentIds = tutorAssignments.map(a => a._id);

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate('assignmentId', 'title')
      .populate('studentId', 'studentName');

    res.status(200).json(submissions);
  } catch (error) {
    console.error('Fetch submissions error:', error.message);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
});

// Tutor: Create Submissions for Their Students (not all students, only those assigned to them)
app.get('/tutors/my-submissions', async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  if (!tutorId) {
    return res.status(403).json({ message: 'Unauthorized: Tutor not logged in' });
  }

  try {
    // Find students assigned to this tutor
    const students = await Student.find({ assignedTutorId: tutorId }).select('_id');
    const studentIds = students.map(s => s._id);

    // Find submissions from those students
    const submissions = await Submission.find({ studentId: { $in: studentIds } })
      .populate('assignmentId')
      .populate('studentId', 'studentName');

    const response = submissions.map(sub => ({
      _id: sub._id,
      assignmentId: sub.assignmentId,
      studentId: sub.studentId._id,
      studentName: sub.studentId.studentName,
      submittedAt: sub.submittedAt,
      answerText: sub.answerText,
      fileUrl: sub.fileUrl
    }));

    res.status(200).json(response);
  } catch (err) {
    console.error('❌ Error fetching submissions:', err.message);
    res.status(500).json({ message: 'Error fetching submissions' });
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











// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);

});
