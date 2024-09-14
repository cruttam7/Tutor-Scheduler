// Import necessary modules at the top
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');

// Initialize the express app
const app = express();

// Middleware to serve static files from the 'frontend/public' folder
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Middleware setup to parse JSON request bodies
app.use(bodyParser.json()); 

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/your-database-name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.log('Failed to connect to MongoDB', err);
});

// Setup routes for student login (already defined)
const studentRoutes = require('./routes/studentRoutes'); // adjust the path as necessary
app.use('/students', studentRoutes);

// Import the User model (for tutors)
const User = require('./models/User');
const Student = require('./models/Student'); // Add Student model here

// Define the /register route for tutor registration
app.post('/register', async (req, res) => {
    try {
      const existingUser = await User.findOne({ email: req.body.email });
  
      if (existingUser) {
        // Email already registered
        return res.status(400).json({ message: 'Email already registered' });
      }
  
      // Hash the user's password
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
  
      // Create a new user with the hashed password
      const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword
      });
  
      // Save the user to the database
      await user.save();
  
      // Send a success response in JSON format
      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      console.error('Error registering user:', err.message); // Log the error message
      res.status(500).json({ message: 'Error registering user' });
    }
});
  
// Define the /login route for tutor login
app.post('/login', async (req, res) => {
  try {
      // Normalize the email to lowercase before searching in the database
      const email = req.body.email.toLowerCase();
      const user = await User.findOne({ email: email });

      if (!user) {
          return res.status(400).json({ message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(req.body.password, user.password);

      if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      // If the credentials are correct, send a success response
      res.status(200).json({ message: 'Login successful' });
  } catch (err) {
      res.status(500).json({ message: 'Error logging in' });
  }
});

// Define the /tutors/create-student route for tutors to create student accounts
app.post('/tutors/create-student', async (req, res) => {
    const { email, password } = req.body;

    // Check if the student email already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
        return res.status(400).json({ message: 'Email already in use by another student' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const student = new Student({
        email,
        password: hashedPassword
    });

    // Save the student
    try {
        await student.save();
        res.status(201).json({ message: 'Student account created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating student account', error: error.message });
    }
});

app.post('/students/login', (req, res) => {
  console.log('Request received on /students/login');
});

// Logout route
app.post('/logout', (req, res) => {
  // Clear the user session or token
  // For example, if using session cookies:
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).send('Failed to log out.');
      }

      // Redirect to the homepage
      res.redirect('/');
  });
});


// Define a simple dashboard route for tutors
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
