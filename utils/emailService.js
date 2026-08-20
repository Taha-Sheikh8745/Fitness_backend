const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;

  const isDummySMTP = 
    !smtpUser || 
    smtpUser.includes('your_email') || 
    smtpUser.includes('example.com') ||
    !smtpPass ||
    smtpPass.includes('your_app_password') ||
    smtpPass.includes('your_gmail_app_password');

  console.log(`\n📧 [FitForge Email Service] Preparing email for: ${options.email}`);
  console.log(`Subject: ${options.subject}`);

  if (isDummySMTP) {
    console.warn('⚠️ SMTP credentials not fully configured in environment variables. Email logged to console fallback.');
    console.log(`[Email Content]: ${options.message}\n`);
    return;
  }

  try {
    const isGmail = smtpHost.includes('gmail');
    
    const transporterConfig = isGmail
      ? {
          service: 'gmail',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        }
      : {
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_PORT == 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: { rejectUnauthorized: false }
        };

    const transporter = nodemailer.createTransport(transporterConfig);

    const fromAddress = `${process.env.EMAIL_FROM_NAME || 'FitForge AI'} <${smtpUser}>`;

    const mailOptions = {
      from: fromAddress,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${options.email} (MessageID: ${info.messageId})\n`);
  } catch (error) {
    console.error(`❌ SMTP Email Sending Error to ${options.email}:`, error.message);
    throw error;
  }
};

module.exports = sendEmail;
