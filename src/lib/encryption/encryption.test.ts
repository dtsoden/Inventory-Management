import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService } from './EncryptionService';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  describe('deriveKey', () => {
    it('derives a consistent key from passphrase and salt', async () => {
      const salt = EncryptionService.generateSalt();
      const key1 = await service.deriveKey('test-passphrase', salt);
      const key2 = await service.deriveKey('test-passphrase', salt);
      expect(key1.toString('hex')).toBe(key2.toString('hex'));
    });

    it('derives different keys for different passphrases', async () => {
      const salt = EncryptionService.generateSalt();
      const key1 = await service.deriveKey('passphrase-one', salt);
      const key2 = await service.deriveKey('passphrase-two', salt);
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });

    it('derives different keys for different salts', async () => {
      const salt1 = EncryptionService.generateSalt();
      const salt2 = EncryptionService.generateSalt();
      const key1 = await service.deriveKey('same-passphrase', salt1);
      const key2 = await service.deriveKey('same-passphrase', salt2);
      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });
  });

  describe('encrypt and decrypt', () => {
    const testKey = Buffer.alloc(32, 'a');

    it('encrypts and decrypts a string correctly', () => {
      const plaintext = 'sk-svcacct-my-secret-api-key';
      const encrypted = service.encrypt(plaintext, testKey);
      const decrypted = service.decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'same-value';
      const encrypted1 = service.encrypt(plaintext, testKey);
      const encrypted2 = service.encrypt(plaintext, testKey);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('handles empty strings', () => {
      const encrypted = service.encrypt('', testKey);
      const decrypted = service.decrypt(encrypted, testKey);
      expect(decrypted).toBe('');
    });

    it('handles unicode content', () => {
      const plaintext = 'Hello worlds emojis';
      const encrypted = service.encrypt(plaintext, testKey);
      const decrypted = service.decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it('fails to decrypt with wrong key', () => {
      const plaintext = 'secret-data';
      const encrypted = service.encrypt(plaintext, testKey);
      const wrongKey = Buffer.alloc(32, 'b');
      expect(() => service.decrypt(encrypted, wrongKey)).toThrow();
    });

    it('fails on tampered ciphertext', () => {
      const plaintext = 'secret-data';
      const encrypted = service.encrypt(plaintext, testKey);
      const tampered = encrypted.slice(0, -4) + 'XXXX';
      expect(() => service.decrypt(tampered, testKey)).toThrow();
    });
  });

  describe('generateSalt', () => {
    it('generates a base64-encoded salt', () => {
      const salt = EncryptionService.generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(0);
      const decoded = Buffer.from(salt, 'base64');
      expect(decoded.length).toBe(16);
    });

    it('generates unique salts', () => {
      const salt1 = EncryptionService.generateSalt();
      const salt2 = EncryptionService.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('hashForVerification', () => {
    it('produces consistent hash for same key', () => {
      const key = Buffer.alloc(32, 'c');
      const hash1 = service.hashForVerification(key);
      const hash2 = service.hashForVerification(key);
      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different keys', () => {
      const key1 = Buffer.alloc(32, 'c');
      const key2 = Buffer.alloc(32, 'd');
      expect(service.hashForVerification(key1)).not.toBe(service.hashForVerification(key2));
    });
  });
});
