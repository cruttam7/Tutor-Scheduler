// Import necessary modules at the top
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

// Initialize the express app
const app = express();

// Middleware to serve static files from the 'public' folder
app.use(express.static('public'));

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

// Import the User model
const User = require('./models/User');

// Define the /register route for user registration
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
  
// Define the /login route for user login
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

  
// Define a simple dashboard route (no token needed)
app.get('/dashboard', (req, res) => {
  res.status(200).send('Welcome to your dashboard!');
});

// Fallback route to serve index.html if no other route matches
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
