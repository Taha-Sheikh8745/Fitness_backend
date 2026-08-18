const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const isDummySMTP = 
    !process.env.SMTP_HOST || 
    !process.env.SMTP_USER || 
    process.env.SMTP_USER.includes('your_email') || 
    process.env.SMTP_USER.includes('example.com') ||
    !process.env.SMTP_PASS ||
    process.env.SMTP_PASS.includes('your_app_password') ||
    process.env.SMTP_PASS.includes('your_gmail_app_password');

  // If SMTP is dummy or in Development Mode, print OTP/email to console for convenience
  if (isDummySMTP || process.env.NODE_ENV !== 'production') {
    console.log('\n=============================================');
    console.log(`[Development Mode] Email to: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message}`);
    console.log('=============================================\n');

    // If SMTP credentials appear real, try sending, but catch errors safely
    if (!isDummySMTP) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_PORT == 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
          from: `${process.env.EMAIL_FROM_NAME || 'FitForge AI'} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
          to: options.email,
          subject: options.subject,
          text: options.message,
          html: options.html,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${options.email}`);
      } catch (err) {
        console.warn(`⚠️ Real SMTP email sending failed (${err.message}). Safe fallback to dev console log.`);
      }
    }
    return;
  }

  // Production Mode with verified credentials
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'FitForge AI'} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`❌ SMTP Error: ${error.message}`);
  }
};

module.exports = sendEmail;
