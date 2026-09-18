import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'shraddha_gold_luxury_manufacturing_jwt_secret_key_2026'
      );
      if (decoded.modelType === 'Customer') {
        req.user = await Customer.findById(decoded.id).select('-password');
      } else {
        req.user = await User.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User session not found or account deactivated'
        });
      }

      if (decoded.modelType === 'Customer') {
        const now = new Date();
        if (req.user.status !== 'Active' || !req.user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Account has been deactivated'
          });
        }
        if (req.user.accessEnd && now > new Date(req.user.accessEnd)) {
          req.user.status = 'Inactive';
          req.user.isActive = false;
          await req.user.save();
          return res.status(401).json({
            success: false,
            message: 'Your access period has expired. Account deactivated.'
          });
        }
        if (req.user.accessStart && now < new Date(req.user.accessStart)) {
          return res.status(401).json({
            success: false,
            message: 'Your access period has not started yet.'
          });
        }
      } else {
        if (!req.user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Account has been deactivated'
          });
        }
      }

      // Ensure backward compatibility if role isn't strictly defined on legacy customers
      if (decoded.modelType === 'Customer' && !req.user.role) {
        req.user.role = 'customer';
      }

      next();
    } catch (error) {
      console.error('[Auth Middleware Error]:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid or expired token'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }
};

/**
 * Restrict routes to specified roles (e.g. 'admin', 'customer')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const userRole = req.user.role;
    // Map legacy 'partner', 'client' to 'customer' if 'customer' is in allowed roles
    const isAllowed =
      roles.includes(userRole) ||
      (roles.includes('customer') && ['partner', 'client', 'retailer', 'wholesaler'].includes(userRole));

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Role '${userRole}' does not have sufficient permission.`
      });
    }

    next();
  };
};

