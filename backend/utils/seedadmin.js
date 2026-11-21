const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'admin@university.edu';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`Admin account already exists: ${existingAdmin.email}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      password: 'Admin@123',
      role: 'admin',
      studentId: null,
    });

    console.log('Default Administrator created successfully!');
    console.log(`Email: ${admin.email}`);
    console.log('Password: Admin@123');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();