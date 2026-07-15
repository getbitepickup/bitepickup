const sgMail = require("@sendgrid/mail");
const logger = require("../utils/logger");

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "orders@hinarok.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Hinarok Orders";

/**
 * Send an email using SendGrid
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise}
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      html,
    };

    const response = await sgMail.send(msg);
    logger.info(
      `✅ Email sent to ${to}: ${response[0]?.statusCode || "success"}`,
    );
    return response;
  } catch (error) {
    logger.error(`❌ Email sending failed: ${error.message}`);
    if (error.response) {
      logger.error(
        `❌ SendGrid error details: ${JSON.stringify(error.response.body)}`,
      );
    }
    throw error;
  }
};

/**
 * Send welcome email to new user
 */
const sendWelcomeEmail = async (user) => {
  const subject = "Welcome to Hinarok!";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#C42348;margin:0;">hinarok</h1>
          <p style="color:#666;margin:4px 0 0;">pickup ordering</p>
        </div>
        
        <h2 style="color:#33101F;margin:0 0 8px;">Welcome to Hinarok, ${user.firstName}! 🎉</h2>
        <p style="color:#666;">We're excited to have you on board.</p>
        <p style="color:#666;">Your account has been created successfully.</p>
        
        <div style="background:#FAF3EA;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Email:</strong> ${user.email}
          </p>
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Role:</strong> ${user.role}
          </p>
        </div>
        
        <p style="color:#666;">You can now log in and start managing your restaurant.</p>
        
        <div style="text-align:center;margin:24px 0;">
          <a href="${process.env.CLIENT_URL}/login" style="display:inline-block;background:#C42348;color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:bold;">
            Go to Dashboard
          </a>
        </div>
        
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">
          Powered by <strong style="color:#C42348;">hinarok</strong>
        </p>
      </div>
    </div>
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
  const subject = "Reset Your Hinarok Password";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#C42348;margin:0;">hinarok</h1>
          <p style="color:#666;margin:4px 0 0;">pickup ordering</p>
        </div>
        
        <h2 style="color:#33101F;margin:0 0 8px;">Password Reset Request</h2>
        <p style="color:#666;">Hi ${user.firstName},</p>
        <p style="color:#666;">You requested to reset your password. Click the link below to reset it:</p>
        
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#E8A13B;color:#33101F;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
        </div>
        
        <p style="color:#666;font-size:13px;">This link will expire in 1 hour.</p>
        <p style="color:#666;font-size:13px;">If you didn't request this, please ignore this email.</p>
        
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">
          Powered by <strong style="color:#C42348;">hinarok</strong>
        </p>
      </div>
    </div>
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
  // Skip if no email provided
  if (!order.customerEmail) {
    logger.info(
      `No email provided for order ${order.orderReference}, skipping confirmation email`,
    );
    return null;
  }

  // Get restaurant details
  const Restaurant = require("../models/Restaurant");
  let restaurant = null;
  try {
    restaurant = await Restaurant.findById(order.restaurantId);
  } catch (error) {
    logger.error(
      `Failed to fetch restaurant for order ${order._id}: ${error.message}`,
    );
  }

  const restaurantName =
    restaurant?.name || order.restaurantName || "Restaurant";
  const restaurantAddress = restaurant?.address || "";
  const restaurantPhone = restaurant?.phone || "";

  const subject = `Order Confirmation #${order.orderReference}`;

  // Build order items list
  const itemsList = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.quantity}x ${item.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#C42348;margin:0;">hinarok</h1>
          <p style="color:#666;margin:4px 0 0;">pickup ordering</p>
        </div>
        
        <div style="background:#EFF8EE;border-radius:8px;padding:12px;text-align:center;margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#2E6B34;font-weight:600;">✅ Order Confirmed!</p>
        </div>
        
        <h2 style="color:#33101F;margin:0 0 8px;">Hi ${order.customerName},</h2>
        <p style="color:#666;margin:0 0 4px;">Your order from <strong>${restaurantName}</strong> has been received and is being prepared.</p>
        
        <div style="background:#FAF3EA;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Order #:</strong> ${order.orderReference}
          </p>
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Pickup Time:</strong> ${order.pickupTimeOption === "ASAP" ? "ASAP (15-20 min)" : order.scheduledTime}
          </p>
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Restaurant:</strong> ${restaurantName}
          </p>
          ${restaurantAddress ? `<p style="margin:4px 0;font-size:14px;color:#33101F;"><strong>Address:</strong> ${restaurantAddress}</p>` : ""}
          ${restaurantPhone ? `<p style="margin:4px 0;font-size:14px;color:#33101F;"><strong>Phone:</strong> ${restaurantPhone}</p>` : ""}
        </div>
        
        <h3 style="color:#33101F;margin:20px 0 12px;">Order Items</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:#f3f3f3;">
              <th style="padding:10px;text-align:left;font-size:13px;">Item</th>
              <th style="padding:10px;text-align:right;font-size:13px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding:10px;font-weight:bold;">Subtotal</td>
              <td style="padding:10px;text-align:right;font-weight:bold;">$${order.subtotal?.toFixed(2) || "0.00"}</td>
            </tr>
            ${
              order.taxAmount
                ? `
            <tr>
              <td style="padding:4px 10px;">Tax</td>
              <td style="padding:4px 10px;text-align:right;">$${order.taxAmount.toFixed(2)}</td>
            </tr>
            `
                : ""
            }
            ${
              order.serviceFee
                ? `
            <tr>
              <td style="padding:4px 10px;">Service Fee</td>
              <td style="padding:4px 10px;text-align:right;">$${order.serviceFee.toFixed(2)}</td>
            </tr>
            `
                : ""
            }
            <tr style="font-size:18px;">
              <td style="padding:10px;font-weight:bold;">Total</td>
              <td style="padding:10px;text-align:right;font-weight:bold;color:#C42348;">$${order.totalPrice.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        ${
          order.specialInstructions
            ? `
          <div style="background:#FFF1E4;border-radius:8px;padding:12px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#33101F;">
              <strong>Special Instructions:</strong> "${order.specialInstructions}"
            </p>
          </div>
        `
            : ""
        }
        
        <div style="background:#FAF3EA;border-radius:8px;padding:12px;text-align:center;margin:16px 0;">
          <p style="margin:0;font-size:14px;color:#33101F;">
            📍 Pickup at: <strong>${restaurantName}</strong>
          </p>
        </div>
        
        <p style="color:#666;font-size:13px;margin:20px 0 8px;">
          You'll receive another email when your order is ready for pickup.
        </p>
        
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">
          Thank you for ordering with ${restaurantName}!<br />
          Powered by <strong style="color:#C42348;">hinarok</strong>
        </p>
      </div>
    </div>
  `;

  try {
    const info = await sendEmail({
      to: order.customerEmail,
      subject,
      html,
    });
    logger.info(`Order confirmation email sent to ${order.customerEmail}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send order confirmation email: ${error.message}`);
    // Don't throw - we don't want to fail the order if email fails
    return null;
  }
};

/**
 * Send order ready notification email
 */
const sendOrderReadyEmail = async (order) => {
  // Skip if no email provided
  if (!order.customerEmail) {
    logger.info(
      `No email provided for order ${order.orderReference}, skipping ready email`,
    );
    return null;
  }

  // Get restaurant details
  const Restaurant = require("../models/Restaurant");
  let restaurant = null;
  try {
    restaurant = await Restaurant.findById(order.restaurantId);
  } catch (error) {
    logger.error(
      `Failed to fetch restaurant for order ${order._id}: ${error.message}`,
    );
  }

  const restaurantName =
    restaurant?.name || order.restaurantName || "Restaurant";
  const restaurantAddress = restaurant?.address || "";
  const restaurantPhone = restaurant?.phone || "";

  const subject = `Your order is ready for pickup! #${order.orderReference}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#C42348;margin:0;">hinarok</h1>
          <p style="color:#666;margin:4px 0 0;">pickup ordering</p>
        </div>
        
        <div style="background:#EFF8EE;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
          <h2 style="color:#2E6B34;margin:0;">✅ Order Ready for Pickup!</h2>
        </div>
        
        <h2 style="color:#33101F;margin:0 0 8px;">Hi ${order.customerName},</h2>
        <p style="color:#666;margin:0 0 4px;">Your order from <strong>${restaurantName}</strong> is now <strong style="color:#2E6B34;">ready for pickup</strong>!</p>
        
        <div style="background:#FAF3EA;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Order #:</strong> ${order.orderReference}
          </p>
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Restaurant:</strong> ${restaurantName}
          </p>
          ${restaurantAddress ? `<p style="margin:4px 0;font-size:14px;color:#33101F;"><strong>Address:</strong> ${restaurantAddress}</p>` : ""}
          ${restaurantPhone ? `<p style="margin:4px 0;font-size:14px;color:#33101F;"><strong>Phone:</strong> ${restaurantPhone}</p>` : ""}
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Pickup Time:</strong> ${order.pickupTimeOption === "ASAP" ? "ASAP" : order.scheduledTime}
          </p>
        </div>
        
        <div style="background:#FFF1E4;border-radius:8px;padding:12px;text-align:center;margin:16px 0;">
          <p style="margin:0;font-size:14px;color:#33101F;font-weight:600;">
            📍 Head to the restaurant to grab your order!
          </p>
        </div>
        
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">
          Thank you for ordering with ${restaurantName}!<br />
          Powered by <strong style="color:#C42348;">hinarok</strong>
        </p>
      </div>
    </div>
  `;

  try {
    const info = await sendEmail({
      to: order.customerEmail,
      subject,
      html,
    });
    logger.info(`Order ready email sent to ${order.customerEmail}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send order ready email: ${error.message}`);
    // Don't throw - we don't want to fail the order if email fails
    return null;
  }
};

/**
 * Send order status update email (generic)
 */
const sendOrderStatusUpdateEmail = async (order) => {
  // Skip if no email provided
  if (!order.customerEmail) {
    logger.info(
      `No email provided for order ${order.orderReference}, skipping status update email`,
    );
    return null;
  }

  // Get restaurant details
  const Restaurant = require("../models/Restaurant");
  let restaurant = null;
  try {
    restaurant = await Restaurant.findById(order.restaurantId);
  } catch (error) {
    logger.error(
      `Failed to fetch restaurant for order ${order._id}: ${error.message}`,
    );
  }

  const restaurantName =
    restaurant?.name || order.restaurantName || "Restaurant";

  const subject = `Order #${order.orderReference} Status Update`;
  const statusMessages = {
    NEW: "has been received and is being prepared.",
    PREPARING: "is now being prepared in the kitchen.",
    READY: "is ready for pickup!",
    COMPLETED: "has been completed. Thank you for your order!",
  };

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">
      <div style="background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:#C42348;margin:0;">hinarok</h1>
          <p style="color:#666;margin:4px 0 0;">pickup ordering</p>
        </div>
        
        <h2 style="color:#33101F;margin:0 0 8px;">Order Status Update</h2>
        <p style="color:#666;">Hi ${order.customerName},</p>
        <p style="color:#666;">Your order #${order.orderReference} ${statusMessages[order.status] || "has been updated."}</p>
        
        <div style="background:#FAF3EA;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Current Status:</strong> ${order.status}
          </p>
          <p style="margin:4px 0;font-size:14px;color:#33101F;">
            <strong>Restaurant:</strong> ${restaurantName}
          </p>
        </div>
        
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        
        <p style="color:#999;font-size:12px;text-align:center;margin:0;">
          Powered by <strong style="color:#C42348;">hinarok</strong>
        </p>
      </div>
    </div>
  `;

  try {
    const info = await sendEmail({
      to: order.customerEmail,
      subject,
      html,
    });
    logger.info(`Order status update email sent to ${order.customerEmail}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send order status update email: ${error.message}`);
    return null;
  }
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderReadyEmail,
  sendOrderStatusUpdateEmail,
};
