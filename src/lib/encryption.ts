import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // If the key is a hex string, convert it to buffer
  if (keyString.length === 64) { // 32 bytes * 2 (hex)
    return Buffer.from(keyString, 'hex');
  }
  
  // Otherwise, derive key from the string using PBKDF2
  return crypto.pbkdf2Sync(keyString, 'salt', 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts a string using AES-256-GCM
 */
export function encryptToken(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from('token-data', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt token data');
  }
}

/**
 * Decrypts a string using AES-256-GCM
 */
export function decryptToken<T = string>(encryptedData: string): T {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, tag, and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('token-data', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted as T;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt token data');
  }
}

/**
 * Generates a new encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
