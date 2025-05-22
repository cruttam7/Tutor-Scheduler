
//////////////////////////////////////////////////////🔰 PART 1: Module Imports, Models, and App Setup//////////////////////////////////////
// // ✅ Import Core Modules
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const compression = require('compression');
const multer = require('multer');
const Message = require('./models/Message'); 
require('dotenv').config();

// ✅ Initialize Express App
const app = express();



const isDev = process.env.NODE_ENV !== 'production';

// Utility Function for Email Uniqueness
async function isEmailTaken(email) {
  const emailLower = email.toLowerCase();
  const [admin, tutor, student] = await Promise.all([
    Admin.findOne({ email: emailLower }),
    User.findOne({ email: emailLower }),
    Student.findOne({ email: emailLower })
  ]);
  return !!(admin || tutor || student);
}


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true if HTTPS in production
    maxAge: isDev ? 7 * 24 * 60 * 60 * 1000 : null // 7 days in dev, session-only in prod
  }
}));


// ✅ Apply Middleware

app.use(express.json());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/uploads', express.static('uploads'));



// ✅ Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.log('Failed to connect to MongoDB', err);
});

// ✅ Models
const User = require('./models/User');           // Tutor
const Student = require('./models/Student');     // Student
const Admin = require('./models/Admin');         // Admin
const Course = require('./models/Course');
const CalendarEvent = require('./models/CalendarEvent');
const Attendance = require('./models/Attendance');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const Grade = require('./models/Grade');

// ✅ Auto-lowercase all incoming emails
app.use((req, res, next) => {
  if (req.body?.email) {
    req.body.email = req.body.email.toLowerCase().trim();
  }
  next();
});
  
// ✅ Analytics Schemas
const sessionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const loginEventSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  role: String,
  timestamp: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', sessionSchema);
const LoginEvent = mongoose.model('LoginEvent', loginEventSchema);

// ✅ File Upload (Multer)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`)
});
const upload = multer({ storage });

// ✅ Email Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false, // true for 465, false for 587
  auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS
}
});

// ✅ Admin Auth Middleware
const adminAuth = (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.status(403).json({ message: 'Access denied. Please log in as admin.' });
};

// ✅ Tutor Auth Middleware
const tutorAuth = (req, res, next) => {
  if (req.session && req.session.tutor) return next();
  res.status(403).json({ message: 'Access denied. Please log in as tutor.' });
};

// ✅ Student Auth Middleware
const studentAuth = (req, res, next) => {
  if (req.session && req.session.student) return next();
  res.status(403).json({ message: 'Access denied. Please log in as student.' });
};

//////////////////////////////////////////////////🔐 PART 2: Admin Login, Logout, Registration, Forgot/Reset Password//////////////////////////////////////
// ✅ Admin Login
app.post('/admin/login', async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    req.session.admin = {
      id: admin._id,
      username: admin.username,
      email: admin.email
    };

    res.status(200).json({ message: 'Admin login successful' });
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ message: 'Error logging in admin' });
  }
});

// ✅ Admin Logout
app.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: 'Failed to log out.' });
      res.status(200).json({ message: 'Admin logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'No active session to log out from.' });
  }
});

// ✅ Admin Info Route
app.get('/admin/info', (req, res) => {
  if (req.session?.admin) {
    res.status(200).json({
      username: req.session.admin.username,
      email: req.session.admin.email
    });
  } else {
    res.status(403).json({ message: 'Not authorized' });
  }
});

// ✅ Admin Forgot Password
app.post('/admin/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Admin not found.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = resetExpires;
    await admin.save();

const resetLink = `${process.env.BASE_URL}/reset-password.html?role=student&token=${resetToken}`;
   const mailOptions = {
  from: 'your-email@example.com',
  to: admin.email,
  subject: '🔐 TASTICODES Admin Password Reset Request',
  html: `
    <div style="background: #f0f2f5; padding: 40px 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); overflow: hidden;">
        
        <div style="background: linear-gradient(90deg, #D4AF37, #f3e8b8); padding: 20px; text-align: center;">
          <img src="cid:logo" alt="TASTICODES Logo" style="width: 100px; height: auto;" />
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="color: #D4AF37; text-align: center;">Password Reset Request</h2>
          <p style="text-align: center; font-size: 16px; color: #555;">We received a request to reset your admin account password.</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

          <p>Hello <strong>${admin.name || 'Admin'}</strong>,</p>
          <p style="line-height: 1.6;">
            To reset your password securely, please click the button below. This link will expire in <strong>15 minutes</strong> for your safety.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
          </div>

          <p>If you didn’t request this reset, you can safely ignore this email.</p>

          <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #999;">
            <p>Need help? Contact support at <a href="mailto:support@tasticodes.com" style="color: #D4AF37; text-decoration: none;">support@tasticodes.com</a></p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} TASTICODES. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: 'tasticodes-logo.png',
      path: __dirname + '/../frontend/public/photo/Tasticodes logo.png',
      cid: 'logo'
    }
  ]
};


    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return res.status(500).json({ message: 'Error sending reset email.' });
      res.status(200).json({ message: 'Password reset email sent.' });
    });
  } catch (error) {
    console.error('Admin forgot password error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Admin Reset Password with Token
app.post('/admin/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) return res.status(400).json({ message: 'Token invalid or expired' });

    // Validate password format
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must include uppercase, number, and special char' });
    }

    // ✅ Prevent password reuse
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as your previous password.' });
    }

    // Hash and update
    admin.password = await bcrypt.hash(newPassword, 10);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;

    await admin.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

//////////////////////////////////👨‍🏫 PART 3: Tutor Registration, Login, Password Reset, and Management/////////////////////////////////
// ✅ Register a New Tutor (Admin Only)
app.post('/admin/register-tutor', adminAuth, async (req, res) => {
    const {
        firstName, lastName, email, phone, address, subjects, qualifications,
        experience, bio, rate, username
    } = req.body;

    try {
        // Check if the email or username is already registered
      if (await isEmailTaken(email) || await User.findOne({ username })) {
  return res.status(400).json({ message: 'Email or username is already in use by another account.' });
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
subjects: Array.isArray(subjects)
  ? subjects.map(subject => subject.trim())
  : subjects.split(',').map(subject => subject.trim()),
            qualifications,
            experience,
            bio,
            rate,
            resetPasswordToken: resetToken,  // Store the reset token
            resetPasswordExpires: resetExpires  // Store the expiration time
        });

        // Save the tutor to the database
        await tutor.save();

        // Send email with the generated password and reset link
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const changePasswordLink = `${BASE_URL}/change-password-tutor.html?token=${resetToken}`;
const mailOptions = {
  from: 'your-email@gmail.com',
  to: tutor.email,
  subject: '🎉 Welcome to TASTICODES - Your Tutor Account is Ready!',
  html: `
    <div style="background: #f6f9fc; padding: 40px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.05); overflow: hidden;">
        
        <div style="background: linear-gradient(90deg, #D4AF37, #f3e8b8); padding: 20px 0; text-align: center;">
          <img src="cid:logo" alt="TASTICODES Logo" style="width: 100px; height: auto;" />
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="text-align: center; color: #D4AF37; font-size: 24px;">Welcome to TASTICODES, ${tutor.firstName} 🎓</h2>
          <p style="text-align: center; font-size: 16px; color: #666; margin-top: 8px;">Empowering Education Through Innovation</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

          <p style="font-size: 16px;">Hi <strong>${tutor.firstName}</strong>,</p>
          <p style="line-height: 1.6;">We are thrilled to welcome you as a tutor at <strong>TASTICODES</strong>! Your account has been successfully created. Below are your login credentials:</p>

          <table style="width: 100%; margin: 20px 0; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0;"><strong>👤 Username:</strong></td>
              <td style="padding: 8px 0;">${tutor.username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>🔐 Temporary Password:</strong></td>
              <td style="padding: 8px 0;">${generatedPassword}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;"><strong>For security, please change your password immediately by clicking below. (Link valid for 1 minute)</strong></p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${changePasswordLink}" style="background-color: #D4AF37; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: bold;">Change Password</a>
          </div>

          <p style="line-height: 1.5;">You'll be directed to a secure page where you can set a new password. If you need help at any point, our support team is here for you.</p>

          <div style="margin-top: 40px;">
            <p style="font-size: 14px; text-align: center; color: #999;">Thank you for being part of TASTICODES 🌟</p>
            <p style="font-size: 13px; text-align: center; color: #aaa;">&copy; ${new Date().getFullYear()} TASTICODES. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: 'tasticodes-logo.png',
      path: __dirname + '/../frontend/public/photo/Tasticodes logo.png',
      cid: 'logo'
    }
  ]
};

        
       transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error sending email:', error);
    return res.status(500).json({ message: 'Error sending email' }); // ✅ Response ends here
  }

  console.log('Email sent:', info.response);
  res.status(201).json({ message: 'Tutor registered successfully. Email sent!' }); // ✅ Only 1 response
});


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
 

// ✅ Tutor Login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    req.session.tutor = {
      id: user._id,
      username: user.username,
      email: user.email,
      subjects: user.subjects || []
    };

    await LoginEvent.create({ userId: user._id, role: user.role });
    await Session.create({ userId: user._id });

    res.status(200).json({ message: 'Login successful', tutor: req.session.tutor });
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

// ✅ Tutor Forgot Password
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

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const resetLink = `${BASE_URL}/reset-password.html?role=teacher&token=${resetToken}`;   
 const mailOptions = {
  from: 'your-email@gmail.com',
  to: tutor.email,
  subject: '🔐 Password Reset Request - TASTICODES Tutor Portal',
  html: `
    <div style="background: #f7f9fb; padding: 40px 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
        
        <div style="background: linear-gradient(90deg, #D4AF37, #f3e8b8); padding: 20px; text-align: center;">
          <img src="cid:logo" alt="TASTICODES Logo" style="width: 100px; height: auto;" />
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="text-align: center; color: #D4AF37;">Reset Your Password</h2>
          <p style="text-align: center; font-size: 16px; color: #555;">A password reset was requested for your tutor account.</p>

          <hr style="margin: 30px 20px; border: none; border-top: 1px solid #eee;" />

          <p>Dear <strong>${tutor.firstName || 'Tutor'}</strong>,</p>
          <p style="line-height: 1.6;">
            To reset your password, click the button below. This secure link will remain valid for <strong>15 minutes</strong>.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #D4AF37; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
          </div>

          <p style="line-height: 1.5;">If you didn't request a password reset, please ignore this message. No changes will be made to your account.</p>

          <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #999;">
            <p>Need help? Reach out at <a href="mailto:support@tasticodes.com" style="color: #D4AF37; text-decoration: none;">support@tasticodes.com</a></p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} TASTICODES. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: 'tasticodes-logo.png',
      path: __dirname + '/../frontend/public/photo/Tasticodes logo.png',
      cid: 'logo'
    }
  ]
};

    transporter.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).json({ message: 'Email failed' });
      res.status(200).json({ message: 'Reset email sent.' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal error' });
  }
});

// ✅ Tutor Reset Password With Token
app.post('/tutors/reset-password-with-token/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const tutor = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!tutor) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // ✅ Password complexity check
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must include uppercase, number, and special character.' });
    }

    // ✅ Prevent reusing old password
    const isSame = await bcrypt.compare(newPassword, tutor.password);
    if (isSame) {
      return res.status(400).json({ message: 'You cannot reuse your previous password.' });
    }

    // ✅ Save new password
    tutor.password = await bcrypt.hash(newPassword, 10);
    tutor.resetPasswordToken = undefined;
    tutor.resetPasswordExpires = undefined;

    await tutor.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Tutor reset error:', error.message);
    res.status(500).json({ message: 'Reset error' });
  }
});


// ✅ Manage Tutors - GET all
app.get('/admin/manage-users/tutors', adminAuth, async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' }, 'firstName lastName email phone address subjects rate');
    res.status(200).json(tutors);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tutors' });
  }
});


// ✅ Edit Tutor
app.put('/admin/manage-users/tutors/:id', adminAuth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, subjects, rate } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, phone, address, subjects, rate },
      { new: true }
    );
    res.status(200).json({ message: 'Tutor updated successfully', tutor: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update tutor' });
  }
});


// ✅ Delete Tutor
app.delete('/admin/manage-users/tutors/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Tutor not found' });
    res.status(200).json({ message: 'Tutor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting tutor' });
  }
});


/////////////////////////////////////////////////👨‍🎓 PART 4: Student Registration, Login, Password Reset, Management, Dashboard////////////////////////////////////
// //// ✅ Tutor Creates Student (With Email Link)
app.post('/tutors/create-student', tutorAuth, async (req, res) => {
  const {
    username, email, studentName, studentDOB, studentGrade, studentSchool,
    guardianName, guardianEmail, guardianPhone, relationship, courses
  } = req.body; // 

  try {
    // ✅ Check if username/email already exists
    if (await isEmailTaken(email) || await Student.findOne({ username })) {
  return res.status(400).json({ message: 'Email or username is already in use by another account.' });
}


    // ✅ Get tutor info from session
    const tutorId = new mongoose.Types.ObjectId(req.session.tutor.id);
    const tutorName = req.session.tutor.username;

    // ✅ Generate secure password and reset token
    const generatedPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

    // ✅ Create new student
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
      assignedTutorId: tutorId,
      assignedTutorName: tutorName,
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
      firstLogin: true
    });

    console.log("📦 Creating student:", student);
    await student.save();

    // ✅ Send welcome email with temp credentials
    const resetLink = `${process.env.BASE_URL}/reset-password-student.html?token=${resetToken}`;
const mailOptions = { 
  from: 'uttam.dhakal777@gmail.com',
  to: email || guardianEmail,
  subject: '🎉 Welcome to TASTICODES – Your Student Account is Ready!',
  html: `
    <div style="background: #f2f6fa; padding: 40px 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
        
        <div style="background: linear-gradient(90deg, #88d3ce, #43b46e); padding: 20px; text-align: center;">
          <img src="cid:logo" alt="TASTICODES Logo" style="width: 100px; height: auto;" />
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="text-align: center; color: #43b46e;">Welcome, ${studentName}! 🎓</h2>
          <p style="text-align: center; font-size: 16px; color: #555;">Your student account has been successfully created.</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

          <p>Hello <strong>${studentName}</strong>,</p>
          <p style="line-height: 1.6;">
            You can now access your learning dashboard. Here are your login credentials:
          </p>

          <table style="width: 100%; margin: 20px 0; font-size: 15px;">
            <tr>
              <td style="padding: 8px 0;"><strong>👤 Username:</strong></td>
              <td style="padding: 8px 0;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>🔐 Temporary Password:</strong></td>
              <td style="padding: 8px 0;">${generatedPassword}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;"><strong>Please change your password immediately by clicking the button below. (Valid for 15 minutes)</strong></p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${changePasswordLink}" style="background-color: #43b46e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Change Password</a>
          </div>

          <p>If you need help or have any questions, feel free to contact our support team.</p>

          <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #999;">
            <p>Happy Learning! 🌟</p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} TASTICODES. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: 'tasticodes-logo.png',
      path: __dirname + '/../frontend/public/photo/Tasticodes logo.png',
      cid: 'logo'
    }
  ]
};

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Email sending error:', err);
        return res.status(500).json({ message: 'Failed to send email' });
      }

      console.log('📨 Email sent:', info.response);
      res.status(201).json({ message: 'Student registered and email sent with temporary credentials.' });
    });

  } catch (error) {
    console.error('❌ Error creating student:', error.message);
    res.status(500).json({ message: 'Error creating student account' });
  }
});



// ✅ Student Login
app.post('/students/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ message: 'Student not found' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    req.session.student = {
      id: student._id,
      email: student.email,
      username: student.username
    };

    await LoginEvent.create({ userId: student._id, role: 'student' });
    await Session.create({ userId: student._id });

    res.status(200).json({ message: 'Login successful', student: req.session.student });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
});

// ✅ Student Forgot Password
app.post('/students/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const student = await Student.findOne({ email });
    if (!student) return res.status(400).json({ message: 'Student not found.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 15 * 60 * 1000;

    student.resetPasswordToken = resetToken;
    student.resetPasswordExpires = resetExpires;
    await student.save();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const resetLink = `${BASE_URL}/reset-password.html?role=student&token=${resetToken}`;
const mailOptions = { 
  from: 'your-email@gmail.com',
  to: student.email,
  subject: '🔐 TASTICODES Student Password Reset Request',
  html: `
    <div style="background: #f2f6fa; padding: 40px 0; font-family: 'Segoe UI', Tahoma, sans-serif; color: #333;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
        
        <div style="background: linear-gradient(90deg, #43b46e, #88d3ce); padding: 20px; text-align: center;">
          <img src="cid:logo" alt="TASTICODES Logo" style="width: 100px; height: auto;" />
        </div>

        <div style="padding: 40px 30px;">
          <h2 style="text-align: center; color: #43b46e;">Reset Your Password</h2>
          <p style="text-align: center; font-size: 16px; color: #555;">Hi ${student.studentName}, we received a request to reset your student account password.</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

          <p style="line-height: 1.6;">Please click the button below to securely reset your password. The link will expire in <strong>15 minutes</strong> for your protection.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #43b46e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
          </div>

          <p style="line-height: 1.5;">If you didn’t request this password reset, you can safely ignore this email. Your account will remain secure.</p>

          <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #999;">
            <p>Need help? Contact <a href="mailto:support@tasticodes.com" style="color: #43b46e; text-decoration: none;">support@tasticodes.com</a></p>
            <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} TASTICODES. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  attachments: [
    {
      filename: 'tasticodes-logo.png',
      path: __dirname + '/../frontend/public/photo/Tasticodes logo.png',
      cid: 'logo'
    }
  ]
};


    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return res.status(500).json({ message: 'Email failed' });
      res.status(200).json({ message: 'Password reset email sent.' });
    });

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ✅ Student Reset Password With Token
app.post('/students/reset-password-with-token/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const student = await Student.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!student) return res.status(400).json({ message: 'Token expired or invalid' });

    // ✅ Password complexity rule
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must include uppercase, number, and special character.' });
    }

    // ✅ Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, student.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from the old one.' });
    }

    // ✅ Save the new password
    student.password = await bcrypt.hash(newPassword, 10);
    student.firstLogin = false;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpires = undefined;

    await student.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Student reset error:', err.message);
    res.status(500).json({ message: 'Reset error' });
  }
});

// ✅ Student Logout
app.post('/students/logout', (req, res) => {
  if (req.session?.student) {
    req.session.destroy(err => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'No student session found' });
  }
});

// ✅ Admin: Manage Students
app.get('/admin/manage-users/students', adminAuth, async (req, res) => {
  try {
    const students = await Student.find({}, 'studentName studentGrade courses email guardianPhone');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students' });
  }
});

app.delete('/admin/manage-users/students/:id', adminAuth, async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student' });
  }
});

// ✅ Student Dashboard API
app.get('/api/student/dashboard', studentAuth, async (req, res) => {
  const studentId = req.session?.student?.id;

  try {
    const student = await Student.findById(studentId).select('-password');
    const events = await CalendarEvent.find({ students: studentId }).sort({ date: 1 }).limit(5);

    res.json({
      student,
      events,
      stars: 12
    });
  } catch (err) {
    console.error('❌ Dashboard fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/////////////////////////////////////////////////📅 PART 5: Event System – Create, Fetch, Update, Delete, Assign/////////////////////////////////////
// ✅ Create Event (Tutor assigns to students)
app.post('/api/events/create', async (req, res) => {
  const { title, date, time, location, description, classType, students, createdBy } = req.body;

  console.log("📥 Incoming Event Payload:", req.body); // ✅ Log everything

  try {
    const newEvent = new CalendarEvent({
      title,
      date,
      time,
      location,
      description,
      classType,
      students,
      createdBy
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    console.error("❌ Error saving event:", err); // ✅ Print real error
    res.status(500).json({ message: "Failed to create event", error: err.message });
  }
});


// ✅ Get all Events for Calendar View
app.get('/api/events', async (req, res) => {
  try {
    const events = await CalendarEvent.find().populate('students', 'studentName studentGrade');
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch events', error: error.message });
  }
});

// ✅ Get Events Created by Tutor
app.get('/api/events/created-by/:email', async (req, res) => {
  try {
    const events = await CalendarEvent.find({ createdBy: req.params.email }).sort({ date: 1 });
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// ✅ Get Events Assigned to Student
app.get('/api/events/assigned-to/:email', async (req, res) => {
  try {
    const events = await CalendarEvent.find({ students: req.params.email }).sort({ date: 1 });
    res.status(200).json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// ✅ View Single Event Details
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id).populate('students');
    if (!event) return res.status(404).json({ message: 'Event not found' });

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
    res.status(500).json({ message: 'Failed to fetch event', error: err.message });
  }
});

// ✅ Get Events for Tomorrow
app.get('/api/events/tomorrow', async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));

    const events = await CalendarEvent.find({ date: { $gte: start, $lte: end } });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tomorrow events', error: error.message });
  }
});

// ✅ Update an Event
app.put('/api/events/update/:id', tutorAuth, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const existingEvent = await CalendarEvent.findById(id);
    if (!existingEvent) return res.status(404).json({ message: 'Event not found' });

    existingEvent.title = updateData.title || existingEvent.title;
    existingEvent.date = updateData.date || existingEvent.date;
    existingEvent.time = updateData.time || existingEvent.time;
    existingEvent.location = updateData.location || existingEvent.location;
    existingEvent.classType = updateData.classType || existingEvent.classType;
    existingEvent.description = updateData.description || existingEvent.description;
    existingEvent.students = Array.isArray(updateData.students) && updateData.students.length > 0
      ? updateData.students
      : existingEvent.students;

    await existingEvent.save();
    res.status(200).json({ message: 'Event updated successfully', event: existingEvent });
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// ✅ Delete an Event
app.delete('/api/events/:id', tutorAuth, async (req, res) => {
  try {
    const deletedEvent = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ message: 'Event not found' });

    res.status(200).json({ message: '🗑️ Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to delete event', error: error.message });
  }
});

// ✅ Student Events (for tutor to track by studentId)
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

////////////////////////////////////////////////////////////////////📬 PART 6: Messaging System – Admin ↔ Tutor///////////////////////////////////////
// Send Message (with file support)
app.post('/api/messages/send', upload.single('attachment'), async (req, res) => {
  const { senderEmail, recipientEmail, subject, body } = req.body;
  const attachment = req.file ? req.file.filename : null;

  try {
    const newMessage = new Message({ senderEmail, recipientEmail, subject, body, attachment });
    await newMessage.save();
    res.status(200).json({ message: '📤 Message sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Fetch inbox
app.get('/api/messages/inbox/:email', async (req, res) => {
  const recipientEmail = req.params.email;

  try {
    const inbox = await Message.find({ recipientEmail }).sort({ timestamp: -1 });

    // Enrich with sender name
    const enriched = await Promise.all(
      inbox.map(async msg => {
        const sender =
          (await Admin.findOne({ email: msg.senderEmail })) ||
          (await User.findOne({ email: msg.senderEmail })) ||
          (await Student.findOne({ email: msg.senderEmail }));

        return {
          ...msg.toObject(),
          senderName: sender?.name || sender?.username || msg.senderEmail
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('❌ Error fetching inbox:', err);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});


// Mark all messages as read
app.put('/api/messages/inbox/mark-read/:email', async (req, res) => {
  try {
    await Message.updateMany({ recipientEmail: req.params.email, read: false }, { $set: { read: true } });
    res.status(200).json({ message: '📨 Messages marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update messages' });
  }
});
// ✅ Mark messages from a specific sender as read (per-thread basis)
app.put('/api/messages/thread/mark-read/:senderEmail', async (req, res) => {
  const recipientEmail = req.session?.tutor?.email || req.session?.admin?.email || req.session?.student?.email;
  const senderEmail = req.params.senderEmail;

  if (!recipientEmail) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await Message.updateMany(
      { senderEmail, recipientEmail, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: 'Thread marked as read' });
  } catch (err) {
    console.error('❌ Error marking thread as read:', err);
    res.status(500).json({ message: 'Failed to update messages' });
  }
});


// Fetch conversation thread
app.get('/api/messages/thread/:sender/:recipient', async (req, res) => {
  try {
    const { sender, recipient } = req.params;
    const messages = await Message.find({
      $or: [
        { senderEmail: sender, recipientEmail: recipient },
        { senderEmail: recipient, recipientEmail: sender }
      ]
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch thread' });
  }
});

// ✅ Get All Admins and Students for Tutor to Message
app.get('/api/tutor/recipients', async (req, res) => {
  try {
    const admins = await Admin.find({}, 'username email');
    const students = await Student.find({}, 'studentName email');

    const recipients = [
      ...admins.map(a => ({ name: a.username, email: a.email, role: 'Admin' })),
      ...students.map(s => ({ name: s.studentName, email: s.email, role: 'Student' }))
    ];

    res.status(200).json(recipients);
  } catch (err) {
    console.error('❌ Error fetching recipients:', err);
    res.status(500).json({ message: 'Failed to load recipients' });
  }
});

// Return logged-in tutor info (name, email, username)
app.get('/api/tutor/me', tutorAuth, async (req, res) => {
  try {
    const tutor = await User.findById(req.session.tutor.id).select('firstName lastName username email');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    res.json({
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      username: tutor.username,
      email: tutor.email
    });
  } catch (err) {
    console.error('Error fetching tutor info:', err.message);
    res.status(500).json({ message: 'Failed to fetch tutor details' });
  }
});

// Return logged-in Admin email
app.get('/api/admin/me', adminAuth, (req, res) => {
  if (req.session?.admin?.email) {
    return res.json({ email: req.session.admin.email });
  } else {
    return res.status(401).json({ message: "Not logged in" });
  }
});


// Return list of admins
app.get('/admins/list', adminAuth, async (req, res) => {
  const admins = await Admin.find({}, 'username email');
  res.json(admins);
});

// Admin loads all tutors and students
app.get('/api/admin/available-users', adminAuth, async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' }, 'firstName lastName email');
    const students = await Student.find({}, 'studentName email');

    const formatted = [
      ...tutors.map(t => ({ email: t.email, name: `${t.firstName} ${t.lastName}`, role: 'Tutor' })),
      ...students.map(s => ({ email: s.email, name: s.studentName, role: 'Student' }))
    ];

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// ✅ Notification mark as read
app.put('/api/messages/mark-read/:email', async (req, res) => {
  const { email } = req.params;

  try {
    await Message.updateMany(
      { senderEmail: email, recipientEmail: 'uttam.dhakal777@gmail.com', read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update messages' });
  }
});


// Sender name in notification

app.get('/api/messages/inbox', async (req, res) => {
  try {
    const email =
      req.session?.admin?.email ||
      req.session?.tutor?.email ||
      req.session?.student?.email;

    if (!email) {
      return res.status(401).json({ message: 'Unauthorized. No session email found.' });
    }

    const inbox = await Message.find({ recipientEmail: email }).sort({ timestamp: -1 });

    const enriched = await Promise.all(
      inbox.map(async msg => {
        const user =
          (await User.findOne({ email: msg.senderEmail })) ||
          (await Student.findOne({ email: msg.senderEmail })) ||
          (await Admin.findOne({ email: msg.senderEmail })) || null;

        return {
          ...msg.toObject(),
          senderName: user?.name || user?.username || msg.senderEmail
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Failed to fetch messages." });
  }
});


// ✅ Get Students Assigned to Logged-in Tutor (minimal info)
app.get('/api/students/min', tutorAuth, async (req, res) => {
  try {
    const tutorId = req.session?.tutor?.id;

    if (!tutorId) {
      return res.status(401).json({ message: 'Unauthorized - No tutor session found' });
    }

    const students = await Student.find(
      { assignedTutorId: tutorId },
      'studentName _id'
    );

    res.status(200).json(students);
  } catch (err) {
    console.error('Error fetching assigned students:', err.message);
    res.status(500).json({ message: 'Failed to load students for this tutor' });
  }
});


///////////////////////////////////////////////////////////////📊 PART 7: Admin Analytics, Stats Widgets, and Trends///////////////////////////////////
// /// ✅ Admin Dashboard Stats Widget
app.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const totalTutors = await User.countDocuments({ role: 'tutor' });
    const totalStudents = await Student.countDocuments();

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3).select('username role email');
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(2).select('studentName email');

    const recentRegistrations = [...recentUsers, ...recentStudents];

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

// ✅ Account Creation Trend – Line Chart
app.get('/admin/account-trend', adminAuth, async (req, res) => {
  try {
    const students = await Student.find({}, 'createdAt');
    const tutors = await User.find({ role: 'tutor' }, 'createdAt');

    const trendData = {};

    students.forEach(({ createdAt }) => {
      const date = createdAt.toISOString().split('T')[0];
      if (!trendData[date]) trendData[date] = { students: 0, tutors: 0 };
      trendData[date].students++;
    });

    tutors.forEach(({ createdAt }) => {
      const date = createdAt.toISOString().split('T')[0];
      if (!trendData[date]) trendData[date] = { students: 0, tutors: 0 };
      trendData[date].tutors++;
    });

    res.json(trendData);
  } catch (err) {
    console.error('Trend fetch error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Daily Logins & Sessions Analytics
app.get('/admin/analytics', adminAuth, async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: 'Missing date range' });

  const start = new Date(from);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  try {
    const [userActive, studentActive, adminActive] = await Promise.all([
      User.countDocuments({ lastLogin: { $gte: start, $lte: end } }),
      Student.countDocuments({ lastLogin: { $gte: start, $lte: end } }),
      Admin.countDocuments({ lastLogin: { $gte: start, $lte: end } })
    ]);

    const activeUsers = userActive + studentActive + adminActive;

    const logins = await LoginEvent.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const sessions = await Session.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ activeUsers, logins, sessions });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ message: 'Error generating analytics' });
  }
});

// ✅ Admin Dashboard HTML Page
app.get('/admin/dashboard', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/admin-dashboard.html'));
});

/////////////////////////////////////////////////////📝 PART 8: Attendance System – Submit, Filter, View, Report///////////////////////////////////
// /// ✅ Submit Weekly Attendance
app.post('/api/attendance/submit', tutorAuth, async (req, res) => {
  try {
    const { records, week } = req.body;
    const tutorId = req.session?.tutor?.id; // ✅ Get the logged-in tutor's ID

    if (!week || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Invalid attendance data or missing week' });
    }

    const newAttendance = new Attendance({
      week,
      records,
      submittedBy: tutorId, // ✅ Set who submitted it
      date: new Date()
    });

    await newAttendance.save();

    res.status(201).json({ message: 'Attendance saved successfully' });
  } catch (err) {
    console.error('Attendance Save Error:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ✅ Filter Attendance Records by Student, Course, or Week
app.get('/api/attendance/records', async (req, res, next) => {
  try {
    const { studentName, course, week } = req.query;
    const query = {};

    if (studentName) query['records.studentName'] = studentName;
    if (course) query['records.course'] = course;
    if (week) query.week = week;

    const records = await Attendance.find(query);
    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
});

// ✅ Attendance Report API (for CSV or front-end display)
app.get('/api/user/attendance-report', async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Missing date range.' });
  }

  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: fromDate, $lte: toDate }
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

////////////////////////////////////////////////////📚 PART 9: Assignments, Submissions, and Grades System///////////////////////////////////
app.get('/api/tutor/recent-activities', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  try {
    const [events, grades, students, attendance] = await Promise.all([
      CalendarEvent.find({ createdBy: tutorId }).sort({ date: -1 }).limit(5),
      Grade.find({ gradedBy: tutorId }).sort({ date: -1 }).limit(5).populate('studentId', 'studentName'),
      Student.find({ assignedTutorId: tutorId }).sort({ createdAt: -1 }).limit(5),
      Attendance.find({ submittedBy: tutorId }).sort({ date: -1 }).limit(5)
    ]);

    const activities = [];

    events.forEach(ev => activities.push({
      type: 'event',
      title: ev.title,
      date: ev.date,
      time: ev.time,
      classType: ev.classType,
      location: ev.location
    }));

    grades.forEach(g => activities.push({
      type: 'grade',
      subject: g.subject,
      score: g.score,
      maxScore: g.maxScore,
      studentName: g.studentId?.studentName || 'Unknown',
      date: g.date
    }));

    students.forEach(s => activities.push({
      type: 'student',
      name: s.studentName,
      date: s.createdAt
    }));

    attendance.forEach(a => activities.push({
      type: 'attendance',
      week: a.week,
      date: a.date
    }));

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(activities.slice(0, 6));
  } catch (err) {
    console.error("❌ Recent activities fetch error:", err.message);
    res.status(500).json({ message: 'Failed to fetch recent activities' });
  }
});

// ✅ Tutor Creates Assignment
app.post('/assignments', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;
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
    res.status(201).json({ message: '📘 Assignment created successfully', assignment });
  } catch (error) {
    console.error('❌ Assignment creation error:', error.message);
    res.status(500).json({ message: 'Failed to create assignment' });
  }
});

// ✅ Student Views Assignments
app.get('/students/my-assignments', studentAuth, async (req, res) => {
  const studentId = req.session?.student?.id;

  try {
    const assignments = await Assignment.find({ assignedTo: studentId })
      .select('title description dueDate subject createdAt');

    res.status(200).json(assignments);
  } catch (error) {
    console.error('❌ Student assignment fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

// ✅ Tutor Views Their Assignments
app.get('/tutors/my-assignments', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;

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

// ✅ Student Submits Assignment (File Upload)
app.post('/assignments/submit-file', studentAuth, upload.single('file'), async (req, res) => {
  const studentId = req.session?.student?.id;
  const { assignmentId, answerText } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const alreadySubmitted = await Submission.findOne({ assignmentId, studentId });
    if (alreadySubmitted) return res.status(400).json({ message: 'Already submitted' });

    const submission = new Submission({
      assignmentId,
      studentId,
      answerText,
      fileUrl
    });

    await submission.save();
    res.status(201).json({ message: '📝 Assignment submitted', file: fileUrl });
  } catch (error) {
    console.error('❌ Submission error:', error.message);
    res.status(500).json({ message: 'Failed to submit assignment' });
  }
});

// ✅ Tutor Views All Submissions
app.get('/tutors/submissions', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  try {
    const tutorAssignments = await Assignment.find({ createdBy: tutorId }).select('_id');
    const assignmentIds = tutorAssignments.map(a => a._id);

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate('assignmentId', 'title')
      .populate('studentId', 'studentName');

    res.status(200).json(submissions);
  } catch (error) {
    console.error('❌ Submission fetch error:', error.message);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
});

// ✅ Grade to Letter Converter
function getGradeLetter(percent) {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 60) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}

// ✅ Tutor Submits a Grade
app.post('/grades', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;
  const { studentId, subject, score, maxScore, feedback } = req.body;

  try {
    const student = await Student.findOne({ _id: studentId, assignedTutorId: tutorId });
    if (!student) return res.status(403).json({ message: 'You cannot grade this student' });

    const grade = new Grade({
      studentId,
      subject,
      score,
      maxScore,
      feedback,
      gradedBy: tutorId
    });

    await grade.save();
    res.status(201).json({ message: '✅ Grade submitted successfully', grade });
  } catch (error) {
    console.error('❌ Grade submission error:', error.message);
    res.status(500).json({ message: 'Failed to submit grade' });
  }
});

// ✅ Student Views Their Grades
app.get('/students/my-grades', studentAuth, async (req, res) => {
  const studentId = req.session?.student?.id;

  try {
    const grades = await Grade.find({ studentId })
      .select('subject score maxScore feedback date gradedBy')
      .populate('gradedBy', 'username');

    res.status(200).json({ grades });
  } catch (err) {
    console.error('❌ Fetch grades error:', err.message);
    res.status(500).json({ message: 'Failed to fetch grades' });
  }
});

// ✅ Tutor Views Grades of Their Students
app.get('/tutors/my-grades', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  try {
    const students = await Student.find({ assignedTutorId: tutorId }).select('_id');
    const studentIds = students.map(s => s._id);

    const grades = await Grade.find({ studentId: { $in: studentIds } })
      .populate('studentId', 'studentName studentGrade email')
      .select('subject score maxScore feedback date');

    res.status(200).json({ grades });
  } catch (err) {
    console.error('❌ Fetch tutor grades error:', err.message);
    res.status(500).json({ message: 'Failed to fetch grades' });
  }
});

// ✅ Update Grade
app.patch('/grades/:id', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;
  const { subject, score, maxScore, feedback } = req.body;

  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade || grade.gradedBy.toString() !== tutorId) {
      return res.status(403).json({ message: 'Access denied to update grade' });
    }

    if (subject) grade.subject = subject;
    if (score) grade.score = score;
    if (maxScore) grade.maxScore = maxScore;
    if (feedback) grade.feedback = feedback;

    await grade.save();
    res.status(200).json({ message: '✅ Grade updated successfully', grade });
  } catch (error) {
    console.error('❌ Update grade error:', error.message);
    res.status(500).json({ message: 'Failed to update grade' });
  }
});

// ✅ Delete Grade
app.delete('/grades/:id', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade || grade.gradedBy.toString() !== tutorId) {
      return res.status(403).json({ message: 'Access denied to delete grade' });
    }

    await grade.deleteOne();
    res.status(200).json({ message: '🗑️ Grade deleted successfully' });
  } catch (error) {
    console.error('❌ Delete grade error:', error.message);
    res.status(500).json({ message: 'Failed to delete grade' });
  }
});

// ✅ Send Grade to Student Inbox
app.post('/grades/:id/send-to-student', tutorAuth, async (req, res) => {
  const tutorId = req.session?.tutor?.id;

  try {
    const grade = await Grade.findById(req.params.id).populate('studentId');
    if (!grade) return res.status(404).json({ message: 'Grade not found' });
    if (grade.gradedBy.toString() !== tutorId) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    const student = grade.studentId;
    const percent = Math.round((grade.score / grade.maxScore) * 100);
    const letter = getGradeLetter(percent);

    const subjectLine = `New Grade for ${grade.subject}`;

    const alreadySent = await Message.findOne({
      senderEmail: req.session.tutor.email,
      recipientEmail: student.email,
      subject: subjectLine
    });

    if (alreadySent) {
      return res.status(409).json({ message: '⚠️ This grade has already been sent to the student.' });
    }

    const message = new Message({
      senderEmail: req.session.tutor.email,
      recipientEmail: student.email,
      subject: subjectLine,
      body: `You received a new grade:\n\nSubject: ${grade.subject}\nScore: ${grade.score}/${grade.maxScore}\nPercentage: ${percent}%\nGrade: ${letter}\nFeedback: ${grade.feedback || 'N/A'}`,
      attachment: ""
    });

    await message.save();
    res.status(200).json({ message: '✅ Grade sent to student inbox!' });
  } catch (err) {
    console.error("❌ Error sending grade to student:", err.message);
    res.status(500).json({ message: 'Failed to send grade to student' });
  }
});




/////////////////////////////////////////////////////////////////✅ Final Additions///////////////////////////////////////////
// 🧪 Insert Sample Data (Testing)
app.get('/api/test/insert-sample-data', async (req, res) => {
  try {
    const session = new Session({
      userId: new mongoose.Types.ObjectId(),
      createdAt: new Date('2025-05-02T10:00:00Z')
    });

    const loginEvent = new LoginEvent({
      userId: session.userId,
      role: 'student',
      timestamp: new Date('2025-05-02T09:00:00Z')
    });

    const attendance = new Attendance({
      week: '2025-W18',
      records: [
        { studentName: 'Alice Johnson', course: 'Mathematics', status: 'Present' },
        { studentName: 'Bob Smith', course: 'Science', status: 'Absent' }
      ],
      date: new Date('2025-05-02T08:00:00Z')
    });

    await session.save();
    await loginEvent.save();
    await attendance.save();

    res.status(201).json({ message: '✅ Sample session, login event, and attendance inserted successfully!' });
  } catch (error) {
    console.error('Error inserting sample data:', error.message);
    res.status(500).json({ message: '❌ Failed to insert sample data.' });
  }
});

/////////////////////////////////////////////////////////////////✅ List of students in tutor dashboard///////////////////////////////////////////
// ✅ New route for full student data (for tutor dashboard table)
app.get('/api/students/detailed', tutorAuth, async (req, res) => {
  try {
    const tutorId = req.session?.tutor?.id;

    const students = await Student.find(
      { assignedTutorId: tutorId },
      'studentName studentGrade courses guardianName guardianEmail guardianPhone email studentDOB'
    );

    res.status(200).json(students);
  } catch (err) {
    console.error('❌ Error fetching detailed students:', err.message);
    res.status(500).json({ message: 'Failed to load students' });
  }
});


// 🏠 Home Route
app.get('/', (req, res) => {
  res.send('🎓 Welcome to the Tutor-Student Management System Backend');
});

// 🔒 404 Fallback
app.use((req, res) => {
  res.status(404).json({ message: '❌ API Route Not Found' });
});

// 🚀 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
