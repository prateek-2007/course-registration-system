/**
 * Role-based authorization middleware.
 * Example usage: router.post('/courses', protect, authorizeRoles('admin'), createCourse)
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(
          `Access forbidden: Role '${req.user ? req.user.role : 'unknown'}' is not authorized to perform this action.`
        )
      );
    }
    next();
  };
};

module.exports = { authorizeRoles };