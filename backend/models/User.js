const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'restaurant_owner', 'customer'],
    default: 'customer'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() {
      return this.role === 'restaurant_owner';
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ FIX: Add toJSON transform to properly serialize restaurantId
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Ensure restaurantId is properly serialized
    if (ret.restaurantId) {
      if (typeof ret.restaurantId === 'object' && ret.restaurantId._id) {
        ret.restaurantId = ret.restaurantId._id.toString();
      } else if (typeof ret.restaurantId === 'object' && ret.restaurantId.id) {
        ret.restaurantId = ret.restaurantId.id.toString();
      } else if (typeof ret.restaurantId === 'object') {
        ret.restaurantId = ret.restaurantId.toString();
      }
    }
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);