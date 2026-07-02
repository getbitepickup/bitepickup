const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Email service for sending transactional emails
 * Currently configured for development/testing
 */

// Create transporter based on environment
const createTransporter = () => {
  // For development, use ethereal.email (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.password'
      }
    });
  }

  // For production, use configured SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise}
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@bitepickup.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email sending failed: ${error.message}`);
    throw error;
  }
};

/**
 * Send welcome email to new user
 */
const sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to BitePickup!';
  const html = `
    <h1>Welcome to BitePickup, ${user.firstName}!</h1>
    <p>We're excited to have you on board.</p>
    <p>Your account has been created successfully.</p>
    <p>Email: ${user.email}</p>
    <p>Role: ${user.role}</p>
    <br>
    <p>Best regards,</p>
    <p>The BitePickup Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your BitePickup Password';
  const html = `
    <h1>Password Reset Request</h1>
    <p>Hi ${user.firstName},</p>
    <p>You requested to reset your password. Click the link below to reset it:</p>
    <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:#000;text-decoration:none;border-radius:5px;">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <br>
    <p>Best regards,</p>
    <p>The BitePickup Team</p>
  `;

  return sendEmail({
    to: user.email,
    subject,
    html,
  });
};

/**
 * Send order confirmation email to customer
 */
const sendOrderConfirmationEmail = async (order) => {
  const subject = `Order Confirmation #${order.orderReference}`;
  
  // Build order items list
  const itemsList = order.items.map(item => `
    <tr>
      <td>${item.quantity}x ${item.name}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <h1>Order Confirmation</h1>
    <p>Hi ${order.customerName},</p>
    <p>Your order has been received and is being prepared.</p>
    
    <h2>Order Details</h2>
    <p><strong>Order #:</strong> ${order.orderReference}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p><strong>Pickup Time:</strong> ${order.pickupTimeOption === 'ASAP' ? 'ASAP' : order.scheduledTime}</p>
    
    <h3>Items:</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#f3f4f6;">
        <th style="padding:8px;text-align:left;">Item</th>
        <th style="padding:8px;text-align:right;">Total</th>
      </tr>
      ${itemsList}
      <tr style="border-top:2px solid #000;">
        <td style="padding:8px;"><strong>Subtotal</strong></td>
        <td style="padding:8px;text-align:right;">$${order.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:8px;">Tax</td>
        <td style="padding:8px;text-align:right;">$${order.taxAmount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:8px;">Service Fee</td>
        <td style="padding:8px;text-align:right;">$${order.serviceFee.toFixed(2)}</td>
      </tr>
      <tr style="font-weight:bold;">
        <td style="padding:8px;">Total</td>
        <td style="padding:8px;text-align:right;">$${order.totalPrice.toFixed(2)}</td>
      </tr>
    </table>
    
    ${order.specialInstructions ? `<p><strong>Special Instructions:</strong> ${order.specialInstructions}</p>` : ''}
    
    <p><strong>Payment Method:</strong> ${order.paymentMethod === 'online' ? 'Paid Online' : 'Pay at Pickup'}</p>
    
    <br>
    <p>Thank you for ordering with ${order.restaurantName}!</p>
    <p>Track your order: ${process.env.CLIENT_URL}/track/${order.orderReference}</p>
    <br>
    <p>Best regards,</p>
    <p>The BitePickup Team</p>
  `;

  return sendEmail({
    to: order.customerEmail || order.customerPhone + '@example.com',
    subject,
    html,
  });
};

/**
 * Send order status update email
 */
const sendOrderStatusUpdateEmail = async (order) => {
  const subject = `Order #${order.orderReference} Status Update`;
  const statusMessages = {
    'NEW': 'has been received and is being prepared.',
    'PREPARING': 'is now being prepared in the kitchen.',
    'READY': 'is ready for pickup!',
    'COMPLETED': 'has been completed. Thank you for your order!'
  };

  const html = `
    <h1>Order Status Update</h1>
    <p>Hi ${order.customerName},</p>
    <p>Your order #${order.orderReference} ${statusMessages[order.status] || 'has been updated.'}</p>
    <p><strong>Current Status:</strong> ${order.status}</p>
    <p><strong>Restaurant:</strong> ${order.restaurantName}</p>
    <br>
    <p>Track your order: ${process.env.CLIENT_URL}/track/${order.orderReference}</p>
    <br>
    <p>Best regards,</p>
    <p>The BitePickup Team</p>
  `;

  return sendEmail({
    to: order.customerEmail || order.customerPhone + '@example.com',
    subject,
    html,
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
};