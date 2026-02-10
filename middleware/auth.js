import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';

/**
 * Protect routes - Verify JWT token
 */
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please login.'
    });
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password -otpCode -otpExpiry');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.'
      });
    }

    // Check if user is verified
    if (!req.user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }
};

/**
 * Authorize specific roles
 * @param  {...String} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

/**
 * Check if user owns the resource or is admin
 */
export const authorizeOwnerOrAdmin = (resourceUserIdField = 'user') => {
  return (req, res, next) => {
    const resourceUserId = req.resource ? req.resource[resourceUserIdField] : null;
    
    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        message: 'Resource validation failed'
      });
    }

    const isOwner = resourceUserId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    next();
  };
};
