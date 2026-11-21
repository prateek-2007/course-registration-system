const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT token for authenticated users.
 * Never embeds sensitive data like password hashes in the payload.
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

module.exports = generateToken;