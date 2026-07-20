const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  // ✅ NEW: Item-specific special instructions (for individual menu items)
  specialInstructions: {
    type: String,
    trim: true,
    default: "",
  },
});

const orderSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  restaurantName: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  customerPhone: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  serviceFee: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  pickupTimeOption: {
    type: String,
    enum: ["ASAP", "scheduled"],
    required: true,
  },
  scheduledTime: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ["online", "pickup"],
    required: true,
  },
  // ✅ Global order-level special instructions
  specialInstructions: {
    type: String,
    trim: true,
    default: "",
  },
  // ✅ Stripe Connect Payment Fields
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  stripePaymentIntentId: {
    type: String,
    index: true,
  },
  stripePaymentStatus: {
    type: String,
    enum: [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "requires_capture",
      "canceled",
      "succeeded",
    ],
    default: "requires_payment_method",
  },
  stripeClientSecret: {
    type: String,
  },
  stripeAccountId: {
    type: String,
    index: true,
  },
  paymentAmount: {
    type: Number,
  },
  paymentCurrency: {
    type: String,
    default: "usd",
  },
  paymentMetadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ["NEW", "PREPARING", "READY", "COMPLETED"],
    default: "NEW",
  },
  orderReference: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient queries
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ stripePaymentIntentId: 1 });
orderSchema.index({ stripeAccountId: 1 });
orderSchema.index({ orderReference: 1 });

module.exports = mongoose.model("Order", orderSchema);
