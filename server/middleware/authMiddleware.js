import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

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
    const secret = process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';

    const decoded = jwt.verify(token, secret);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: 'अमान्य टोकन (Unauthorized: Invalid token payload)',
      });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'उपयोगकर्ता नहीं मिला (Unauthorized: Admin not found)',
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
