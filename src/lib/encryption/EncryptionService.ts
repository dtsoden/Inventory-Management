import { createCipheriv, createDecipheriv, randomBytes, createHash, pbkdf2 } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCODING = 'base64' as const;

/**
 * Centralized encryption service using AES-256-GCM.
 * All encrypt/decrypt operations in the application flow through this class.
 */
export class EncryptionService {
  async deriveKey(passphrase: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const saltBuffer = Buffer.from(salt, ENCODING);
      pbkdf2(passphrase, saltBuffer, 600_000, KEY_LENGTH, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  encrypt(plaintext: string, key: Buffer): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, encrypted, authTag]);
    return packed.toString(ENCODING);
  }

  decrypt(encryptedValue: string, key: Buffer): string {
    const packed = Buffer.from(encryptedValue, ENCODING);
    if (packed.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }
    const iv = packed.subarray(0, IV_LENGTH);
    const authTag = packed.subarray(packed.length - TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH, packed.length - TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  }

  static generateSalt(): string {
    return randomBytes(SALT_LENGTH).toString(ENCODING);
  }

  hashForVerification(key: Buffer): string {
    return createHash('sha256').update(key).digest(ENCODING);
  }
}
