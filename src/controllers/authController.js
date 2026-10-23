const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const CaregiverProfile = require('../models/CaregiverProfile');
const PharmacyProfile = require('../models/PharmacyProfile');
const { recordAudit } = require('../services/auditService');

/**
 * Register a new user with chosen role and create corresponding role profile
 */
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      timezone,
      // Role-specific fields
      specialty,
      licenseNumber,
      clinicHospital,
      pharmacyName,
      address,
      relationship,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and role are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.',
      });
    }

    // Create base user
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      phone: phone || '',
      timezone: timezone || 'UTC',
    });

    await user.save();

    // Create role-specific profile document
    if (role === 'patient') {
      await PatientProfile.create({
        user: user._id,
        allergies: [],
      });
    } else if (role === 'doctor') {
      await DoctorProfile.create({
        user: user._id,
        specialty: specialty || 'General Practice',
        licenseNumber: licenseNumber || `MD-${Math.floor(100000 + Math.random() * 900000)}`,
        clinicHospital: clinicHospital || 'MediSync Partner Clinic',
        verifiedStatus: false, // Self-registered doctors are unverified demo accounts by default
      });
    } else if (role === 'caregiver') {
      await CaregiverProfile.create({
        user: user._id,
        relationship: relationship || 'Family Member',
        phone: phone || '',
      });
    } else if (role === 'pharmacy') {
      await PharmacyProfile.create({
        user: user._id,
        pharmacyName: pharmacyName || `${name}'s Pharmacy`,
        licenseNumber: licenseNumber || `PHARM-${Math.floor(100000 + Math.random() * 900000)}`,
        address: address || '100 Medical Center Blvd',
        phone: phone || '555-0199',
        verifiedStatus: false,
      });
    }

    // Establish persistent session
    req.session.userId = user._id;
    req.session.role = user.role;

    await recordAudit({
      actor: user,
      actorRole: user.role,
      action: 'user_registered',
      description: `New user ${user.name} registered with role ${user.role}`,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error during registration.',
    });
  }
};

/**
 * Log in an existing user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended or deactivated.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Save user ID to session
    req.session.userId = user._id;
    req.session.role = user.role;

    await recordAudit({
      actor: user,
      actorRole: user.role,
      action: 'user_login',
      description: `User ${user.email} logged in.`,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during login.',
    });
  }
};

/**
 * Log out current user
 */
const logout = async (req, res) => {
  try {
    if (req.user) {
      await recordAudit({
        actor: req.user,
        actorRole: req.user.role,
        action: 'user_logout',
        description: `User ${req.user.email} logged out.`,
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Could not log out at this time.',
        });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error during logout.',
    });
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    const user = req.user.toSafeObject();
    let profile = null;

    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ user: user._id });
    } else if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ user: user._id });
    } else if (user.role === 'caregiver') {
      profile = await CaregiverProfile.findOne({ user: user._id });
    } else if (user.role === 'pharmacy') {
      profile = await PharmacyProfile.findOne({ user: user._id });
    }

    return res.status(200).json({
      success: true,
      user,
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error retrieving profile.',
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
