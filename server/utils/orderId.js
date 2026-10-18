/**
 * Generates unique human-readable order references
 * Example: KIR-2026-8A3F
 */
export const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without confusing chars (0, O, 1, I)
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestamp = Date.now().toString().slice(-4);
  return `KIR-${year}-${random}${timestamp}`;
};
