import User from '../models/User.js';
import Customer from '../models/Customer.js';
import { formatDateTimeIST } from '../utils/dateUtils.js';
import generateToken from '../utils/generateToken.js';
import jwt from 'jsonwebtoken';

/**
 * @desc    Authenticate user via Email, Username, or Mobile Number & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validate inputs
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your identifier (email, username, or mobile) and password'
      });
    }

    const cleanIdentifier = identifier.trim();

    // Determine query strategy: email, mobile number, or username
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);
    // Remove potential non-digits if looking like phone number, but check cleaned string
    const isPhone = /^[+]?[0-9\s\-]{7,15}$/.test(cleanIdentifier) && !cleanIdentifier.includes('@');

    let query = {};
    if (isEmail) {
      query = { email: cleanIdentifier.toLowerCase() };
    } else if (isPhone) {
      // Clean phone number to digits only or search raw
      const digitsOnly = cleanIdentifier.replace(/[^0-9+]/g, '');
      query = {
        $or: [
          { mobile: cleanIdentifier },
          { mobile: digitsOnly },
          { mobile: `+91${digitsOnly.slice(-10)}` },
          { mobile: digitsOnly.slice(-10) }
        ]
      };
    } else {
      // Username search (case-insensitive)
      query = { username: cleanIdentifier.toLowerCase() };
    }

    let user = await User.findOne(query);
    let modelType = 'User';

    if (!user) {
      // Fallback: Check if it's a Customer logging in
      let customerQuery = {};
      if (isEmail) {
        customerQuery = { email: cleanIdentifier.toLowerCase() };
      } else if (isPhone) {
        const digitsOnly = cleanIdentifier.replace(/[^0-9+]/g, '');
        customerQuery = {
          $or: [
            { phones: cleanIdentifier },
            { phones: digitsOnly },
            { phones: `+91${digitsOnly.slice(-10)}` },
            { phones: digitsOnly.slice(-10) }
          ]
        };
      } else {
        // Customer model now has a username
        customerQuery = { username: cleanIdentifier.toLowerCase() };
      }

      user = await Customer.findOne(customerQuery).select('+password');
      if (user) {
        modelType = 'Customer';
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found with provided identifier'
      });
    }

    if (modelType === 'Customer') {
      if (user.status !== 'Active' || !user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account access has been deactivated. Please contact Shraddha Gold administrator.'
        });
      }

      const now = new Date();
      if (user.accessEnd && now > new Date(user.accessEnd)) {
        user.status = 'Inactive';
        user.isActive = false;
        await user.save();
        return res.status(403).json({
          success: false,
          isExpired: true,
          accessEnd: user.accessEnd,
          message: `Your catalog access period concluded on ${formatDateTimeIST(user.accessEnd)}. Your account is now inactive. Please contact your Shraddha Gold account manager for renewal.`
        });
      }

      if (user.accessStart && now < new Date(user.accessStart)) {
        return res.status(403).json({
          success: false,
          message: `Your access period has not started yet. Access will be available from ${formatDateTimeIST(user.accessStart)}.`
        });
      }
    } else {
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account access has been deactivated. Please contact Shraddha Gold administrator.'
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect. Please check your credentials.'
      });
    }

    // Success response matching requirement
    // Generate token with modelType included
    const token = jwt.sign(
      { id: user._id, modelType },
      process.env.JWT_SECRET || 'shraddha_gold_luxury_manufacturing_jwt_secret_key_2026',
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful. Welcome to Shraddha Gold.',
      token,
      user: {
        id: user._id,
        name: user.name || user.businessName,
        email: user.email,
        username: user.username || user.email,
        mobile: modelType === 'Customer' ? user.phones : user.mobile,
        companyName: user.companyName || user.businessName,
        role: user.role || 'customer',
        plainPassword: user.plainPassword || '',
        ...(modelType === 'Customer' && {
          city: user.city,
          contacts: user.contacts,
          notes: user.notes
        })
      }
    });
  } catch (error) {
    console.error('[Login Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing authentication'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    let user;
    let isCustomer = false;
    
    // Check if req.user role suggests it's a Customer
    if (req.user.role === 'customer') {
      user = await Customer.findById(req.user._id).select('-password');
      if (user) isCustomer = true;
    }
    
    if (!user) {
      user = await User.findById(req.user._id).select('-password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const userData = {
      id: user._id,
      name: user.name || user.businessName,
      email: user.email,
      username: user.username || user.email,
      mobile: isCustomer ? user.phones : user.mobile,
      companyName: user.companyName || user.businessName,
      role: user.role || 'customer',
      plainPassword: user.plainPassword || '',
      createdAt: user.createdAt,
      // Add all personal details for customers
      ...(isCustomer && {
        city: user.city,
        contacts: user.contacts,
        notes: user.notes
      })
    };

    res.status(200).json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('[GetMe Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile'
    });
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    let user;
    let isCustomer = false;
    
    if (req.user.role === 'customer') {
      user = await Customer.findById(req.user._id);
      if (user) isCustomer = true;
    }
    if (!user) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const { name, email, mobile, companyName, city, contacts } = req.body;

    if (name) {
      user.name = name.trim();
      if (isCustomer) user.businessName = name.trim();
    }
    if (companyName !== undefined) {
      if (isCustomer) user.businessName = companyName.trim();
      else user.companyName = companyName.trim();
    }
    if (isCustomer && city !== undefined) {
      user.city = city.trim();
    }
    if (isCustomer && contacts !== undefined && Array.isArray(contacts)) {
      user.contacts = contacts.filter(c => c && (c.phone || c.name));
    }

    if (email && email.toLowerCase() !== user.email) {
      const Model = isCustomer ? Customer : User;
      const existingEmail = await Model.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'This email address is already in use by another account' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (mobile) {
      const mobileArray = Array.isArray(mobile) ? mobile : [mobile];
      const validMobiles = mobileArray.map(m => String(m).trim()).filter(Boolean);
      
      if (validMobiles.length > 0) {
        const Model = isCustomer ? Customer : User;
        const mobileField = isCustomer ? 'phones' : 'mobile';
        const existingMobile = await Model.findOne({ [mobileField]: { $in: validMobiles }, _id: { $ne: user._id } });
        if (existingMobile) {
          return res.status(400).json({ success: false, message: 'One or more mobile numbers are already in use by another account' });
        }
        if (isCustomer) user.phones = validMobiles;
        else user.mobile = validMobiles;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile information updated successfully',
      user: {
        id: user._id,
        name: user.name || user.businessName,
        email: user.email,
        username: user.username || user.email,
        mobile: isCustomer ? user.phones : user.mobile,
        companyName: user.companyName || user.businessName,
        role: user.role || 'customer',
        plainPassword: user.plainPassword || '',
        createdAt: user.createdAt,
        ...(isCustomer && {
          city: user.city,
          contacts: user.contacts,
          notes: user.notes
        })
      }
    });
  } catch (error) {
    console.error('[UpdateProfile Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * @desc    Change current user password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters in length'
      });
    }

    let user;
    let isCustomer = false;
    
    if (req.user.role === 'customer') {
      user = await Customer.findById(req.user._id);
      if (user) isCustomer = true;
    }
    if (!user) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match our records'
      });
    }

    user.password = newPassword;
    user.plainPassword = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      plainPassword: newPassword
    });
  } catch (error) {
    console.error('[ChangePassword Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update password',
      error: error.message
    });
  }
};
