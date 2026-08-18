const generateOTPEmailTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #021B32; color: #ffffff; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #0A2740; padding: 40px; border-radius: 16px; border: 1px solid rgba(0, 230, 255, 0.2); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #00E6FF; font-size: 28px; font-weight: bold; text-decoration: none; }
    .otp-box { background: rgba(0, 230, 255, 0.1); border: 2px dashed #00E6FF; padding: 20px; text-align: center; font-size: 36px; letter-spacing: 8px; font-weight: bold; border-radius: 12px; margin: 30px 0; color: #00E6FF; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FITFORGE AI</div>
    </div>
    <h2 style="text-align: center;">Verify Your Account</h2>
    <p>We're thrilled to have you join FitForge AI! Please use the verification code below to activate your account. This code is valid for 5 minutes.</p>
    <div class="otp-box">${otp}</div>
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} FitForge AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const generateWelcomeEmailTemplate = (name) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #021B32; color: #ffffff; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #0A2740; padding: 40px; border-radius: 16px; border: 1px solid rgba(0, 230, 255, 0.2); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { color: #00E6FF; font-size: 28px; font-weight: bold; text-decoration: none; }
    .hero { background: linear-gradient(135deg, rgba(0,230,255,0.1), transparent); padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center; }
    .btn { display: inline-block; background-color: #00E6FF; color: #021B32; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FITFORGE AI</div>
    </div>
    <div class="hero">
      <h2>Welcome to the Future of Fitness, ${name}!</h2>
      <p>Your account is now fully active. It's time to shatter your limits.</p>
    </div>
    <p>FitForge AI uses intelligent analytics and clean data tracking to ensure every workout pushes you closer to your ultimate physique.</p>
    <p>Log in now to set up your profile, configure your initial fitness goals, and begin logging your progress.</p>
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="btn">Access Dashboard</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} FitForge AI. Unleash your potential.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = {
  generateOTPEmailTemplate,
  generateWelcomeEmailTemplate
};
