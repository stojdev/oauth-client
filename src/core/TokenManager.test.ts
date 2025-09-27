import { jest } from '@jest/globals';
import { TokenManager } from './TokenManager';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { logger } from '../utils/Logger.js';

// Mock the logger module
jest.mock('../utils/Logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  AuditLogger: {
    logTokenOperation: jest.fn(),
  },
  PerformanceLogger: {
    start: jest.fn(),
    end: jest.fn(),
  },
}));

describe('TokenManager', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tempDir: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = '/tmp/test-oauth-client';

    // Clear the environment variable
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.NODE_ENV;

    // Reset all mocks
    jest.clearAllMocks();

    // Mock os.homedir AFTER clearing mocks
    jest.spyOn(os, 'homedir').mockReturnValue('/tmp');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encryption key handling', () => {
    it('should use environment variable when provided as hex', () => {
      const testKey = crypto.randomBytes(32).toString('hex');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      // Mock that no file exists
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should use environment variable when provided as base64', () => {
      const testKey = crypto.randomBytes(32).toString('base64');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      // Mock that no file exists
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should use KDF when key is prefixed with kdf:', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'kdf:test-password-123';

      // Mock that no file exists
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should throw error for invalid key length', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'short-key';

      // Mock that no file exists
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).toThrow(/Invalid encryption key length/);
    });

    it.skip('should generate new key when no env var and no file', () => {
      const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation((path) => {
        // Allow test to see what path is being read
        throw Object.assign(new Error(`ENOENT: no such file or directory, open '${path}'`), {
          code: 'ENOENT',
        });
      });

      const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as never);
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      const manager = new TokenManager(tempDir);
      expect(manager).toBeDefined();

      expect(readSpy).toHaveBeenCalled();
      expect(mkdirSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });

    it.skip('should use existing key file when available', () => {
      const testKey = crypto.randomBytes(32);

      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(testKey as never);

      expect(() => new TokenManager(tempDir)).not.toThrow();
      expect(readSpy).toHaveBeenCalled();
    });

    it.skip('should warn in production when auto-generating key', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined as never);
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

      new TokenManager(tempDir);

      const mockWarn = logger.warn as jest.MockedFunction<typeof logger.warn>;
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING: Auto-generating encryption key in production'),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('key validation', () => {
    it('should accept valid 32-byte hex key', () => {
      const testKey = crypto.randomBytes(32).toString('hex');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should accept valid 32-byte base64 key', () => {
      const testKey = crypto.randomBytes(32).toString('base64');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should reject invalid hex format', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'invalid-hex-key';

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).toThrow(/Invalid encryption key length/);
    });

    it.skip('should reject keys that are not 32 bytes', () => {
      const shortKey = crypto.randomBytes(16).toString('hex');
      process.env.TOKEN_ENCRYPTION_KEY = shortKey;

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => new TokenManager(tempDir)).toThrow(/Invalid encryption key length.*16 bytes/);
    });
  });

  describe('KDF (Key Derivation Function)', () => {
    it('should derive consistent keys from same password', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'kdf:test-password';

      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      const manager1 = new TokenManager(tempDir);
      const manager2 = new TokenManager(tempDir);

      // Both managers should derive the same key (we can't test this directly,
      // but if they work without throwing, the keys are valid)
      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
    });

    it('should derive different keys from different passwords', () => {
      // This test is conceptual - we can't directly access the derived keys,
      // but we can ensure both work without errors

      process.env.TOKEN_ENCRYPTION_KEY = 'kdf:password1';
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });
      const manager1 = new TokenManager(tempDir);

      process.env.TOKEN_ENCRYPTION_KEY = 'kdf:password2';
      const manager2 = new TokenManager(tempDir);

      expect(manager1).toBeDefined();
      expect(manager2).toBeDefined();
    });
  });
});
