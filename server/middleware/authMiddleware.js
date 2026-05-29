const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Get the token from the request header package
  const token = req.header('Authorization')?.split(' ')[1]; // Expects format: "Bearer TOKEN_STRING"

  // Check if no token exists
  if (!token) {
    return res.status(401).json({ message: 'No authorization token, access denied.' });
  }

  // Verify the token validity
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Appends the employee's ID and role profile to the request configuration
    next(); // Moves on to the actual API data function safely
  } catch (error) {
    res.status(401).json({ message: 'Token authentication failed, invalid access.' });
  }
};