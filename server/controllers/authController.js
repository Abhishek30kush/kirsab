import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया ईमेल और पासवर्ड दर्ज करें (Email and password are required)',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const admin = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
      });
    }

    const secret = process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      secret,
      { expiresIn }
    );

    return res.json({
      success: true,
      message: 'सफलतापूर्वक लॉगिन किया गया (Login successful)',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि (Server error during login)',
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि (Server error)',
      error: error.message,
    });
  }
};
