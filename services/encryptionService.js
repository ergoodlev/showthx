/**
 * Encryption Service
 * Provides optional end-to-end encryption for videos using NaCl box encryption
 * Allows secure video sharing without exposing video to Supabase in plaintext
 */

import nacl from 'tweetnacl';
import * as ExpoCrypto from 'expo-crypto';
import { storeEncryptionKey, getEncryptionKey } from './secureStorageService';

// Store PRNG seed globally to avoid re-seeding on every call
let prngSeeded = false;

/**
 * Ensure nacl PRNG is seeded with cryptographically secure random bytes
 * Must be called before any nacl operation
 */
async function ensurePRNG() {
  if (!prngSeeded) {
    try {
      const randomBytes = await ExpoCrypto.getRandomBytesAsync(32);
      let byteIndex = 0;

      nacl.setPRNG(function(x) {
        const bytes = new Uint8Array(x);
        for (let i = 0; i < x; i++) {
          bytes[i] = randomBytes[byteIndex++ % 32];
        }
        return bytes;
      });

      prngSeeded = true;
      console.log('[ENCRYPTION] PRNG seeded successfully');
    } catch (error) {
      console.error('[ENCRYPTION ERROR] Failed to seed PRNG:', error);
      throw error;
    }
  }
}

/**
 * Generate a new encryption keypair
 * Returns both public key (shared with recipients) and secret key (stored securely)
 * @returns {Promise<{publicKey: string, secretKey: string}>}
 */
export async function generateKeypair() {
  try {
    // Ensure PRNG is seeded before using nacl
    await ensurePRNG();

    const keyPair = nacl.box.keyPair();

    // Convert to base64 for storage
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64');
    const secretKey = Buffer.from(keyPair.secretKey).toString('base64');

    // Store secret key securely
    await storeEncryptionKey(secretKey);

    console.log('[ENCRYPTION] Generated new encryption keypair');

    return { publicKey, secretKey };
  } catch (error) {
    console.error('[ENCRYPTION ERROR] Failed to generate keypair:', error);
    throw error;
  }
}

/**
 * Get stored public key for sharing
 * @returns {Promise<string|null>}
 */
export async function getPublicKey() {
  try {
    // In a real implementation, this would be stored in Supabase user metadata
    // For now, regenerate from stored secret key
    const secretKeyB64 = await getEncryptionKey();
    if (!secretKeyB64) return null;

    const secretKey = Buffer.from(secretKeyB64, 'base64');
    const publicKey = nacl.box.keyPair.fromSecretKey(secretKey).publicKey;

    return Buffer.from(publicKey).toString('base64');
  } catch (error) {
    console.error('[ENCRYPTION ERROR] Failed to get public key:', error);
    return null;
  }
}

/**
 * Encrypt data with recipient's public key
 * Used for encrypting video metadata/sharing info
 * @param {string} message - Message to encrypt
 * @param {string} recipientPublicKeyB64 - Recipient's public key in base64
 * @returns {Promise<string>} - Encrypted message in base64
 */
export async function encryptForRecipient(message, recipientPublicKeyB64) {
  try {
    // Ensure PRNG is seeded before using nacl
    await ensurePRNG();

    const secretKeyB64 = await getEncryptionKey();
    if (!secretKeyB64) {
      throw new Error('Encryption not configured');
    }

    const secretKey = Buffer.from(secretKeyB64, 'base64');
    const recipientPublicKey = Buffer.from(recipientPublicKeyB64, 'base64');
    const messageBytes = Buffer.from(message, 'utf-8');

    // Generate nonce
    const nonce = nacl.randomBytes(nacl.box.nonceLength);

    // Encrypt
    const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, secretKey);

    // Combine nonce + encrypted message
    const combined = Buffer.concat([nonce, encrypted]);

    console.log('[ENCRYPTION] Encrypted message for recipient');

    return combined.toString('base64');
  } catch (error) {
    console.error('[ENCRYPTION ERROR] Failed to encrypt:', error);
    throw error;
  }
}

/**
 * Decrypt data with stored secret key
 * Used for decrypting video metadata/sharing info
 * @param {string} encryptedMessageB64 - Encrypted message in base64
 * @param {string} senderPublicKeyB64 - Sender's public key in base64
 * @returns {Promise<string>} - Decrypted message
 */
export async function decryptFromSender(encryptedMessageB64, senderPublicKeyB64) {
  try {
    const secretKeyB64 = await getEncryptionKey();
    if (!secretKeyB64) {
      throw new Error('Encryption not configured');
    }

    const secretKey = Buffer.from(secretKeyB64, 'base64');
    const senderPublicKey = Buffer.from(senderPublicKeyB64, 'base64');
    const combined = Buffer.from(encryptedMessageB64, 'base64');

    // Split nonce and encrypted message
    const nonce = combined.slice(0, nacl.box.nonceLength);
    const encrypted = combined.slice(nacl.box.nonceLength);

    // Decrypt
    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, secretKey);

    if (!decrypted) {
      throw new Error('Decryption failed - message may be corrupted or from different sender');
    }

    console.log('[ENCRYPTION] Decrypted message from sender');

    return Buffer.from(decrypted).toString('utf-8');
  } catch (error) {
    console.error('[ENCRYPTION ERROR] Failed to decrypt:', error);
    throw error;
  }
}

/**
 * Optional: Encrypt file data (for advanced implementation)
 * This would handle actual video file encryption if needed
 * @param {Buffer} fileData - Binary file data
 * @param {string} recipientPublicKeyB64 - Recipient's public key
 * @returns {Promise<Buffer>} - Encrypted file data
 */
export async function encryptFileData(fileData, recipientPublicKeyB64) {
  try {
    const secretKeyB64 = await getEncryptionKey();
    if (!secretKeyB64) {
      throw new Error('Encryption not configured');
    }

    const secretKey = Buffer.from(secretKeyB64, 'base64');
    const recipientPublicKey = Buffer.from(recipientPublicKeyB64, 'base64');

    // For large files, use secretbox (symmetric encryption) instead of box
    // Generate random nonce
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

    // Use BLAKE2b hash of secret key for symmetric encryption
    const hash = nacl.hash(secretKey);
    const key = hash.slice(0, nacl.secretbox.keyLength);

    // Encrypt
    const encrypted = nacl.secretbox(fileData, nonce, key);

    // Combine nonce + encrypted data
    const combined = Buffer.concat([nonce, encrypted]);

    console.log('[ENCRYPTION] Encrypted file data');

    return combined;
  } catch (error) {
    console.error('[ENCRYPTION ERROR] Failed to encrypt file:', error);
    throw error;
  }
}

/**
 * Decrypt file data
 * @param {Buffer} encryptedData - Encrypted file data (nonce + ciphertext)
 * @returns {Promise<Buffer>} - Decrypted file data
 */
export async function decryptFileData(encryptedData) {
  try {
    const secretKeyB64 = await getEncryptionKey();
    if (!secretKeyB64) {
      throw new Error('Encryption not configured');
    }

    const secretKey = Buffer.from(secretKeyB64, 'base64');

    // Split nonce and encrypted data
    const nonce = encryptedData.slice(0, nacl.secretbox.nonceLength);
    const encrypted = encryptedData.slice(nacl.secretbox.nonceLength);

    // Hash secret key for symmetric decryption
    const hash = nacl.hash(secretKey);
    const key = hash.slice(0, nacl.secretbox.keyLength);

    // Decrypt
    const decrypted = nacl.secretbox.open(encrypted, nonce, key);

    if (!decrypted) {
      throw new Error('Decryption failed - file may be corrupted');
    }

    console.log('[ENCRYPTION] Decrypted file data');

    return Buffer.from(decrypted);
  } catch (error) {
    console.error('[ENCRYPTION ERROR] Failed to decrypt file:', error);
    throw error;
  }
}
