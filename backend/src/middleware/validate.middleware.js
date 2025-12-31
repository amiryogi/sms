const { validationResult } = require('express-validator');
const { ApiError } = require('../utils');

/**
 * Validation middleware
 * Checks validation result from express-validator and throws error if invalid
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    throw ApiError.badRequest('Validation failed', errorMessages);
  }

  next();
};

module.exports = validate;
