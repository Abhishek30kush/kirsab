import rateLimit from 'express-rate-limit';

// Rate limiter for authentication routes (prevents brute-force)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 login attempts per IP per 15 minutes
  message: {
    success: false,
    message: 'बहुत अधिक लॉगिन प्रयास। कृपया 15 मिनट बाद पुनः प्रयास करें (Too many login attempts, please try again later)',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
export const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});
