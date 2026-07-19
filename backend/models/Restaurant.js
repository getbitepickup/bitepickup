const mongoose = require("mongoose");

const dailyHoursSchema = new mongoose.Schema({
  isOpen: {
    type: Boolean,
    default: true,
  },
  openTime: {
    type: String,
    default: "09:00 AM",
  },
  closeTime: {
    type: String,
    default: "10:00 PM",
  },
});

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  coverImage: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isOrderingPaused: {
    type: Boolean,
    default: false,
  },
  businessHours: {
    Monday: dailyHoursSchema,
    Tuesday: dailyHoursSchema,
    Wednesday: dailyHoursSchema,
    Thursday: dailyHoursSchema,
    Friday: dailyHoursSchema,
    Saturday: dailyHoursSchema,
    Sunday: dailyHoursSchema,
  },
  pickupSettings: {
    allowAsap: {
      type: Boolean,
      default: true,
    },
    allowScheduled: {
      type: Boolean,
      default: true,
    },
    prepTimeMinutes: {
      type: Number,
      default: 15,
    },
  },
  taxesAndFees: {
    taxRatePercent: {
      type: Number,
      default: 8.5,
    },
    serviceFeeAmount: {
      type: Number,
      default: 0, // ✅ FIX: Changed from 2.5 to 0
    },
  },
  subscription: {
    tier: {
      type: String,
      enum: ["starter", "pro", "enterprise"],
      default: "starter",
    },
    status: {
      type: String,
      enum: ["active", "pending", "suspended", "cancelled"],
      default: "pending",
    },
    validUntil: Date,
  },
  // ✅ Stripe Connect Fields
  stripeConnect: {
    accountId: {
      type: String,
      index: true,
      sparse: true,
    },
    accountStatus: {
      type: String,
      enum: ["pending", "connected", "disabled", "onboarding"],
      default: "pending",
    },
    connectedAt: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    accessToken: {
      type: String,
      select: false,
    },
    accountEmail: {
      type: String,
    },
    chargesEnabled: {
      type: Boolean,
      default: false,
    },
    payoutsEnabled: {
      type: Boolean,
      default: false,
    },
    detailsSubmitted: {
      type: Boolean,
      default: false,
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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

// Index for efficient queries
restaurantSchema.index({ "stripeConnect.accountId": 1 });

module.exports = mongoose.model("Restaurant", restaurantSchema);
