const { validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Middleware to validate request using express-validator
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log the errors for debugging
    console.log('❌ Validation errors:', JSON.stringify(errors.array(), null, 2));
    console.log('❌ Request body:', JSON.stringify(req.body, null, 2));
    
    return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  
  next();
};

module.exports = {
  validateRequest,
};