const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const orderSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  restaurantName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  serviceFee: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    required: true
  },
  pickupTimeOption: {
    type: String,
    enum: ['ASAP', 'scheduled'],
    required: true
  },
  scheduledTime: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'pickup'],
    required: true
  },
  status: {
    type: String,
    enum: ['NEW', 'PREPARING', 'READY', 'COMPLETED'],
    default: 'NEW'
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  orderReference: {
    type: String,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);