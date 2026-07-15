// using Twilio SendGrid's v3 Node.js Library
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

// Set API key from environment variable
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Uncomment if using EU data residency
// sgMail.setDataResidency('eu');

const msg = {
  to: "mustafaraheel26@gmail.com", // 🔴 CHANGE THIS to your email address
  from: "orders@hinarok.com", // This must be your verified sender
  subject: "✅ Hinarok - SendGrid Test Successful!",
  text: "This is a test email from Hinarok using SendGrid.",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background: #FAF3EA; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; border: 1px solid #E7C7CF; }
        .header { text-align: center; border-bottom: 2px solid #C42348; padding-bottom: 20px; }
        .header h1 { color: #C42348; font-family: 'Baloo 2', sans-serif; font-size: 24px; }
        .content { padding: 20px 0; }
        .success { background: #EFF8EE; padding: 15px; border-radius: 12px; text-align: center; }
        .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #E7C7CF; color: #8C6B76; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 SendGrid is Ready!</h1>
        </div>
        <div class="content">
          <p>Dear Hinarok Team,</p>
          <div class="success">
            ✅ Your SendGrid integration is working perfectly!
            <br><br>
            <strong>Sender:</strong> orders@hinarok.com<br>
            <strong>Status:</strong> Verified ✅
          </div>
          <p style="margin-top: 20px; color: #8C6B76; font-size: 14px;">
            You are now ready to send real emails to your customers.
          </p>
        </div>
        <div class="footer">
          <p style="color: #C42348;">🍒 Hinarok - Zero-commission pickup ordering</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

sgMail
  .send(msg)
  .then(() => {
    console.log("✅ Email sent successfully! Check your inbox.");
    console.log("📧 To: " + msg.to);
    console.log("📧 From: " + msg.from);
  })
  .catch((error) => {
    console.error("❌ Error sending email:");
    if (error.response) {
      console.error("Status:", error.response.statusCode);
      console.error("Body:", error.response.body);
    } else {
      console.error(error);
    }
  });
