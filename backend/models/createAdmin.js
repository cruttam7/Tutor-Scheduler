const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./Admin'); // Make sure this path is correct if in different folder

// ✅ Connect to your MongoDB (update DB name if needed)
mongoose.connect('mongodb://localhost:27017/your-database-name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err);
});

async function createAdmin() {
  const username = 'admin'; // You can customize this
  const email = 'uttam.dhakal777@gmail.com'.toLowerCase(); // ✅ Normalize
  const password = 'Ron@ldo777'; // Choose a strong password

  try {
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log('⚠️ Admin already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword
    });

    await newAdmin.save();
    console.log('✅ Admin created successfully!');
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

createAdmin();
