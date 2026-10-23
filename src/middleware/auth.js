const User = require('../models/User');

/**
 * Ensures user is authenticated via session
 */
const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to continue.',
    });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user || user.status !== 'active') {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        error: 'Session invalid or account deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Authentication verification failed.',
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden: Role '${req.user.role}' is not authorized for this resource.`,
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
