import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get internal cryptographic secret for PIN operations
 */
function getPinSecret() {
  return (
    process.env.PIN_SECRET ||
    process.env.JWT_SECRET ||
    'kirsab_super_secret_pin_hmac_key_shervani_legacy_2026'
  );
}

/**
 * Derive a 32-byte key from secret
 */
function deriveKey() {
  return crypto.createHash('sha256').update(getPinSecret()).digest();
}

/**
 * Generate a cryptographically secure 6-digit numeric delivery PIN
 * Guaranteed to be between 100000 and 999999
 */
export function generateSecurePin() {
  const pinNum = crypto.randomInt(100000, 1000000);
  return pinNum.toString();
}

/**
 * Create a keyed HMAC-SHA256 hash of the 6-digit PIN bound to the order ID/number
 * Adding orderId ensures no cross-order collisions or rainbow table attacks
 */
export function hashPin(orderIdentifier, pin) {
  if (!orderIdentifier || !pin) {
    throw new Error('Order identifier and PIN are required for hashing');
  }
  const cleanPin = String(pin).trim();
  const hmac = crypto.createHmac('sha256', getPinSecret());
  hmac.update(`${orderIdentifier}:${cleanPin}`);
  return hmac.digest('hex');
}

/**
 * Verify an entered PIN against the stored hash in constant time
 * Returns true if valid, false otherwise
 */
export function verifyPin(orderIdentifier, enteredPin, storedHash) {
  if (!orderIdentifier || !enteredPin || !storedHash) {
    return false;
  }
  const cleanEntered = String(enteredPin).trim();
  // Valid PIN must be exactly 6 digits
  if (!/^\d{6}$/.test(cleanEntered)) {
    return false;
  }

  const computedHash = hashPin(orderIdentifier, cleanEntered);

  const storedBuffer = Buffer.from(storedHash, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

/**
 * Encrypt the 6-digit PIN using AES-256-GCM
 * So only the authenticated customer can retrieve and view their active PIN
 */
export function encryptPin(pin) {
  if (!pin) return null;
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(pin), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt the encrypted PIN for authenticated customer display
 */
export function decryptPin(encryptedPayload) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return null;
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = deriveKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt PIN:', err.message);
    return null;
  }
}
