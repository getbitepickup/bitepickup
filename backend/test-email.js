const dotenv = require("dotenv");
dotenv.config();

const nodemailer = require("nodemailer");

// Create transporter with SSL fix
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_PORT === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // FIX: Bypass SSL certificate validation for testing
  tls: {
    rejectUnauthorized: false,
  },
});

// Test email
async function testEmail() {
  try {
    console.log("📧 Testing email with:");
    console.log("  Host:", process.env.SMTP_HOST);
    console.log("  Port:", process.env.SMTP_PORT);
    console.log("  User:", process.env.SMTP_USER);
    console.log("  From:", process.env.EMAIL_FROM || "noreply@hinarok.com");

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@hinarok.com",
      to: "mustafaraheel26@gmail.com", // Send to yourself
      subject: "Test Email from Hinarok",
      html: `
        <h1>✅ Test Email Working!</h1>
        <p>This is a test email from Hinarok.</p>
        <p>If you received this, your email setup is correct!</p>
        <br>
        <p>Best regards,</p>
        <p>Hinarok Team</p>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("  Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    console.error("  Full error:", error);
  }
}

testEmail();
