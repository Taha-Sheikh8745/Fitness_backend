const sendEmail = require('../utils/emailService');
require('dotenv').config();

async function test() {
  try {
    await sendEmail({
      email: process.env.SMTP_USER,
      subject: 'FitForge AI - Verification Code Test',
      message: 'Your verification code is: 987654. It will expire in 5 minutes.',
      html: '<h1>FitForge AI Verification Code</h1><p>Your verification code is: <strong>987654</strong></p>',
    });
    console.log('Test completed!');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

test();
