import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const getJwtSecret = () =>
  process.env.JWT_SECRET || 'kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate standard JWT token for any user entity
 */
function createToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}

/**
 * Admin Login (Preserves existing behavior, supports AdminUser & User table)
 */
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

    // 1. Check AdminUser table
    let admin = await prisma.adminUser.findUnique({
      where: { email: cleanEmail },
    });

    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
        });
      }

      const token = createToken({
        userId: admin.id,
        email: admin.email,
        role: admin.role || 'admin',
      });

      return res.json({
        success: true,
        message: 'सफलतापूर्वक लॉगिन किया गया (Login successful)',
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role || 'admin',
        },
      });
    }

    // 2. Check unified User table for admin role
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { phone: cleanEmail }],
        role: 'admin',
      },
    });

    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
        });
      }

      const token = createToken({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      });

      return res.json({
        success: true,
        message: 'सफलतापूर्वक लॉगिन किया गया (Login successful)',
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
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

/**
 * Return current authenticated user profile
 */
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

/**
 * Customer Registration
 * Input: name, phone (10 digits), password, optional email
 */
export const customerRegister = async (req, res) => {
  try {
    const { name, phone, password, email } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'कृपया अपना पूरा नाम लिखें (Full name must be at least 2 characters)',
      });
    }

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया 10 अंकों का मान्य भारतीय मोबाइल नंबर दर्ज करें (Valid 10-digit mobile number required)',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be at least 6 characters)',
      });
    }

    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;

    // Check existing phone
    const existingPhone = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: 'यह मोबाइल नंबर पहले से पंजीकृत है। कृपया लॉगिन करें। (Mobile number already registered. Please log in)',
      });
    }

    if (cleanEmail) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'यह ईमेल पहले से पंजीकृत है। (Email already registered)',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        passwordHash,
        role: 'customer',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = createToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      message: 'खाता सफलतापूर्वक बनाया गया (Account registered successfully)',
      token,
      user,
    });
  } catch (error) {
    console.error('Customer registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'पंजीकरण में त्रुटि (Registration failed)',
      error: error.message,
    });
  }
};

/**
 * Customer Login
 * Input: phone or email + password
 */
export const customerLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मोबाइल नंबर/ईमेल और पासवर्ड दर्ज करें (Mobile/email and password required)',
      });
    }

    const cleanIdentifier = identifier.trim();
    const isPhone = /^[0-9]{10}$/.test(cleanIdentifier.replace(/[^0-9]/g, ''));
    const cleanPhone = cleanIdentifier.replace(/[^0-9]/g, '');

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          isPhone ? { phone: cleanPhone } : null,
          { email: cleanIdentifier.toLowerCase() },
          { phone: cleanIdentifier },
        ].filter(Boolean),
      },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!user || (user.role !== 'customer' && user.role !== 'admin')) {
      return res.status(401).json({
        success: false,
        message: 'गलत मोबाइल नंबर/ईमेल या पासवर्ड (Invalid credentials)',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'यह खाता निष्क्रिय है। कृपया ग्राहक सेवा से संपर्क करें। (Account deactivated)',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'गलत मोबाइल नंबर/ईमेल या पासवर्ड (Invalid credentials)',
      });
    }

    const token = createToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      message: 'सफलतापूर्वक लॉगिन किया गया (Login successful)',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({
      success: false,
      message: 'लॉगिन में त्रुटि (Login failed)',
      error: error.message,
    });
  }
};

/**
 * Delivery Partner Login
 * Input: phone or email + password
 * Validates role = delivery_partner and isActive = true
 */
export const deliveryLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मोबाइल/ईमेल और पासवर्ड दर्ज करें (Identifier and password required)',
      });
    }

    const cleanIdentifier = identifier.trim();
    const cleanPhone = cleanIdentifier.replace(/[^0-9]/g, '');

    const partner = await prisma.user.findFirst({
      where: {
        OR: [
          cleanPhone.length === 10 ? { phone: cleanPhone } : null,
          { email: cleanIdentifier.toLowerCase() },
          { phone: cleanIdentifier },
        ].filter(Boolean),
        role: 'delivery_partner',
      },
    });

    if (!partner) {
      return res.status(401).json({
        success: false,
        message: 'डिलीवरी पार्टनर खाता नहीं मिला या गलत जानकारी (Delivery partner account not found or invalid credentials)',
      });
    }

    if (!partner.isActive) {
      return res.status(403).json({
        success: false,
        message: 'आपका पार्टनर खाता निष्क्रिय कर दिया गया है। कृपया एडमिन से संपर्क करें। (Your partner account is suspended/inactive)',
      });
    }

    const isMatch = await bcrypt.compare(password, partner.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'गलत पासवर्ड (Invalid password)',
      });
    }

    const token = createToken({
      userId: partner.id,
      phone: partner.phone,
      email: partner.email,
      role: partner.role,
    });

    return res.json({
      success: true,
      message: 'डिलीवरी पोर्टल में स्वागत है (Welcome to Delivery Portal)',
      token,
      partner: {
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        role: partner.role,
        vehicleType: partner.vehicleType,
        vehicleNumber: partner.vehicleNumber,
      },
    });
  } catch (error) {
    console.error('Delivery partner login error:', error);
    return res.status(500).json({
      success: false,
      message: 'लॉगिन में त्रुटि (Login failed)',
      error: error.message,
    });
  }
};
