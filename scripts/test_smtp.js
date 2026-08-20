const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('Testing SMTP with settings:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass:', process.env.SMTP_PASS ? '*****' : 'NONE');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"FitForge AI" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'FitForge AI - Test Email Verification Code',
      text: 'Your verification code is: 123456',
      html: '<h2>Your verification code is: <strong>123456</strong></h2>',
    });
    console.log('SUCCESS! Email sent:', info.messageId);
  } catch (err) {
    console.error('ERROR sending email:', err);
  }
}

testEmail();
