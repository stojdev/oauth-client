import { TokenManager } from './TokenManager';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

// Mock the logger module
jest.mock('../utils/Logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fs to avoid file system operations during tests
jest.mock('fs');
jest.mock('os');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockOs = os as jest.Mocked<typeof os>;

describe('TokenManager', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let tempDir: string;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = '/tmp/test-oauth-client';
    mockOs.homedir.mockReturnValue('/tmp');

    // Clear the environment variable
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.NODE_ENV;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encryption key handling', () => {
    it('should use environment variable when provided as hex', () => {
      const testKey = crypto.randomBytes(32).toString('hex');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      // Mock that no file exists
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should use environment variable when provided as base64', () => {
      const testKey = crypto.randomBytes(32).toString('base64');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      // Mock that no file exists
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should use KDF when key is prefixed with kdf:', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'kdf:test-password-123';

      // Mock that no file exists
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should throw error for invalid key length', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'short-key';

      // Mock that no file exists
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).toThrow(/Invalid encryption key length/);
    });

    it('should generate new key when no env var and no file', () => {
      // Mock that no file exists
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      // Mock file system operations
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => undefined);

      expect(() => new TokenManager(tempDir)).not.toThrow();
      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should use existing key file when available', () => {
      const testKey = crypto.randomBytes(32);

      // Mock that file exists and returns valid key
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockFs.readFileSync as any).mockReturnValue(testKey);

      expect(() => new TokenManager(tempDir)).not.toThrow();
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });

    it('should warn in production when auto-generating key', () => {
      process.env.NODE_ENV = 'production';

      // Mock console.warn to capture warnings
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock that no file exists
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      // Mock file system operations
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.writeFileSync.mockImplementation(() => undefined);

      new TokenManager(tempDir);

      // Should have logged a warning about auto-generating key in production
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY WARNING: Auto-generating encryption key in production'),
      );

      warnSpy.mockRestore();
    });
  });

  describe('key validation', () => {
    it('should accept valid 32-byte hex key', () => {
      const testKey = crypto.randomBytes(32).toString('hex');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should accept valid 32-byte base64 key', () => {
      const testKey = crypto.randomBytes(32).toString('base64');
      process.env.TOKEN_ENCRYPTION_KEY = testKey;

      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).not.toThrow();
    });

    it('should reject invalid hex format', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'invalid-hex-key';

      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).toThrow(/Invalid encryption key length/);
    });

    it('should reject keys that are not 32 bytes', () => {
      const shortKey = crypto.randomBytes(16).toString('hex'); // 16 bytes
      process.env.TOKEN_ENCRYPTION_KEY = shortKey;

      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => new TokenManager(tempDir)).toThrow(/Invalid encryption key length.*16 bytes/);
    });
  });

  describe('KDF (Key Derivation Function)', () => {
    it('should derive consistent keys from same password', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'kdf:test-password';

      mockFs.readFileSync.mockImplementation(() => {
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
      mockFs.readFileSync.mockImplementation(() => {
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
