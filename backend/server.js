const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import modules
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { HTTP_STATUS } = require("./utils/constants");

// Import routes
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const menuItemRoutes = require("./routes/menuItemRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

// Import SSE handler
const {
  handleSSEConnection,
  broadcastNewOrder,
} = require("./controllers/sseController");

// Initialize Express
const app = express();

// Rate limiting - FIXED for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and webhooks
    return req.path === "/health" || req.path === "/api/webhooks/stripe";
  },
});

// ============================================
// ✅ STRIPE WEBHOOK - Must be before express.json()
// ============================================
app.use("/api/webhooks", webhookRoutes);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration - Allow all origins for development
app.use(
  cors({
    origin: "*", // Allow all origins for development
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Apply rate limiting to all requests
app.use("/api", limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ============================================
// ✅ SSE - Server-Sent Events Endpoint
// ============================================
app.get("/api/orders/stream/:restaurantId", handleSSEConnection);

// ============================================
// API Routes
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/menu-items", menuItemRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/stripe", stripeRoutes);

// 404 Not Found handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    logger.info("⏳ Connecting to MongoDB...");

    // Connect to MongoDB
    await connectDB();

    logger.info("✅ MongoDB connected successfully!");

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(
        `🔗 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`,
      );
    });
  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  logger.error(`❌ Unhandled Rejection: ${error.message}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
  process.exit(1);
});

startServer();

module.exports = app;
