const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./Admin');  // Adjust the path to reference the correct model

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/your-database-name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

async function createAdmin() {
  const username = 'admin';  // Set your desired admin username
  const email = 'uttam.dhakal777@gmail.com';  // Set your admin email
  const password = 'Ron@ldo777';  // Set your desired admin password

  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('Admin already exists.');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const admin = new Admin({
      username,
      email,
      password: hashedPassword
    });

    // Save the admin to the database
    await admin.save();
    console.log('Admin created successfully!');
  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    // Close the database connection
    mongoose.disconnect();
  }
}

// Call the function to create the admin
createAdmin();
