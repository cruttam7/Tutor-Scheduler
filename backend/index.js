// Import necessary modules at the top
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Initialize the express app
const app = express();

// Middleware to serve static files from the 'frontend/public' folder
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use(express.json());



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













//new backend code by manish
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName studentGrade courses guardianName guardianEmail guardianPhone createdAt');
    const studentList = students.map(student => ({
      name: student.studentName,
      studentDOB: student.studentDOB,
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

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
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


// // Define the /tutors/create-student route for tutors to create student accounts
// app.post('/tutors/create-student', async (req, res) => {
//   const {
//     username, email, password, studentName, studentDOB, studentGrade, studentSchool,
//     guardianName, guardianEmail, guardianPhone, relationship, courses
//   } = req.body;

//   try {
//     // Validate required fields
//     if (!username || !email || !password || !studentName || !studentDOB || !studentGrade || 
//       !studentSchool || !guardianName || !guardianEmail || !guardianPhone || !relationship) {
//       return res.status(400).json({ message: 'All fields are required' });
//     }

//     // Check if the student username or email already exists
//     const existingStudent = await Student.findOne({ $or: [{ email }, { username }] });
//     if (existingStudent) {
//       return res.status(400).json({ message: 'Username or email already in use by another student' });
//     }

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create new student
//     const student = new Student({
//       username,
//       email,
//       password: hashedPassword,
//       studentName,
//       studentDOB,
//       studentGrade,
//       studentSchool,
//       guardianName,
//       guardianEmail,
//       guardianPhone,
//       relationship,
//       courses
//     });

//     // Save the student
//     await student.save();
//     res.status(201).json({ message: 'Student account created successfully' });
//   } catch (error) {
//     console.error('Error creating student account:', error.message);
//     res.status(500).json({ message: 'Error creating student account', error: error.message });
//   }
// });

//addedby manish
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





//added upto here































const CalendarEvent = require('./models/CalendarEvent'); // Import the model

// API Route to Add Event
app.post('/api/calendar/add', async (req, res) => {
  try {
      const { title, description, date, tutorId, studentIds } = req.body;

      const newEvent = new CalendarEvent({
          title,
          description,
          date,
          tutor: tutorId,
          students: studentIds
      });

      await newEvent.save();
      res.status(201).json({ message: 'Event added successfully', event: newEvent });
  } catch (error) {
      console.error('Error adding event:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
});


// API Route to Fetch Student Events
app.get('/api/calendar/student-events/:studentId', async (req, res) => {
  try {
      const studentId = req.params.studentId;
      const events = await CalendarEvent.find({ students: studentId }).populate('tutor');
      res.json(events);
  } catch (error) {
      console.error('Error fetching student events:', error);
      res.status(500).json({ message: 'Internal server error' });
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





// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);

});
