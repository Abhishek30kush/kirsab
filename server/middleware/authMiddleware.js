import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';

/**
 * Helper to decode and verify token from header
 */
const verifyTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
};

/**
 * Require Admin: ensures authenticated user is an administrator
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'प्रमाणीकरण आवश्यक है (Unauthorized: Missing or invalid token)',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'अमान्य टोकन (Unauthorized: Invalid token payload)',
      });
    }

    // Check existing AdminUser table first for backwards compatibility
    let admin = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    // Fallback: check unified User table with role = 'admin'
    if (!admin) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });
      if (user && user.role === 'admin' && user.isActive) {
        admin = user;
      }
    }

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: 'केवल व्यवस्थापक अनुमति प्राप्त है (Forbidden: Admin privileges required)',
      });
    }

    req.user = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'सत्र समाप्त हो गया है, कृपया पुनः लॉगिन करें (Token expired, please login again)',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'प्रमाणीकरण विफल (Unauthorized: Authentication failed)',
      error: error.message,
    });
  }
};

/**
 * Require Delivery Partner: ensures user is active delivery partner
 */
export const requireDeliveryPartner = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'डिलीवरी पार्टनर लॉगिन आवश्यक है (Unauthorized: Delivery partner token required)',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'अमान्य टोकन (Unauthorized: Invalid token payload)',
      });
    }

    const partner = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        vehicleType: true,
        vehicleNumber: true,
      },
    });

    if (!partner || partner.role !== 'delivery_partner') {
      return res.status(403).json({
        success: false,
        message: 'केवल अधिकृत डिलीवरी पार्टनर ही यह कर सकते हैं (Forbidden: Delivery partner access only)',
      });
    }

    if (!partner.isActive) {
      return res.status(403).json({
        success: false,
        message: 'आपका डिलीवरी पार्टनर खाता निष्क्रिय है। कृपया एडमिन से संपर्क करें। (Account deactivated. Please contact admin)',
      });
    }

    req.user = partner;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'सत्र समाप्त हो गया है, कृपया पुनः लॉगिन करें (Session expired, please login again)',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'प्रमाणीकरण विफल (Authentication failed)',
      error: error.message,
    });
  }
};

/**
 * Require Customer: ensures user is an authenticated customer
 */
export const requireCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'कृपया पहले लॉगिन करें (Unauthorized: Please log in to your customer account)',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'अमान्य टोकन (Unauthorized: Invalid token payload)',
      });
    }

    const customer = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!customer || (customer.role !== 'customer' && customer.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'ग्राहक खाता आवश्यक है (Customer account required)',
      });
    }

    if (!customer.isActive) {
      return res.status(403).json({
        success: false,
        message: 'यह खाता निष्क्रिय कर दिया गया है (Account deactivated)',
      });
    }

    req.user = customer;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'सत्र समाप्त हो गया है, कृपया पुनः लॉगिन करें (Session expired, please login again)',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'प्रमाणीकरण विफल (Authentication failed)',
      error: error.message,
    });
  }
};

/**
 * Optional Auth: extracts user info if bearer token is provided, without rejecting if not
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const decoded = verifyTokenFromHeader(req.headers.authorization);
    if (decoded && decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, phone: true, email: true, role: true, isActive: true },
      });
      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
};
