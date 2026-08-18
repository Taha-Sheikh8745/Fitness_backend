require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminEmail = 'admin@fitforge.com';
    const adminPassword = 'Admin@123';

    const userExists = await User.findOne({ email: adminEmail });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    if (userExists) {
      console.log('Admin user already exists. Updating password...');
      userExists.password = hashedPassword;
      userExists.role = 'admin';
      userExists.isVerified = true;
      await userExists.save();
      console.log('Admin user updated successfully!');
      process.exit();
    }

    await User.create({
      name: 'FitForge Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    });

    console.log('Admin user created successfully!');
    console.log('Email: ' + adminEmail);
    console.log('Password: ' + adminPassword);
    
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
