import { promises as fs, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { logger } from '../utils/Logger.js';
import { isTokenExpired, calculateExpiryTime } from '../utils/Validators.js';
import type { TokenResponse, StoredToken } from '../types/index.js';

/**
 * Manages secure storage and retrieval of OAuth tokens
 */
export class TokenManager {
  private storageDir: string;
  private encryptionKey: Buffer;
  private tokens: Map<string, StoredToken> = new Map();

  constructor(storageDir?: string) {
    this.storageDir = storageDir || path.join(os.homedir(), '.oauth-client', 'tokens');

    // Generate or load encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey();

    // Load existing tokens
    this.loadTokens().catch((err) => {
      logger.error('Failed to load tokens', err);
    });
  }

  /**
   * Store a token
   */
  async storeToken(provider: string, token: TokenResponse): Promise<void> {
    const storedToken: StoredToken = {
      ...token,
      provider,
      createdAt: Date.now(),
      expiresAt: calculateExpiryTime(token.expires_in),
    };

    this.tokens.set(provider, storedToken);
    await this.persistTokens();

    logger.info(`Token stored for provider: ${provider}`);
  }

  /**
   * Retrieve a token
   */
  async getToken(provider: string): Promise<StoredToken | null> {
    const token = this.tokens.get(provider);

    if (!token) {
      return null;
    }

    if (isTokenExpired(token.expiresAt)) {
      logger.warn(`Token expired for provider: ${provider}`);
      this.tokens.delete(provider);
      await this.persistTokens();
      return null;
    }

    return token;
  }

  /**
   * Delete a token
   */
  async deleteToken(provider: string): Promise<void> {
    this.tokens.delete(provider);
    await this.persistTokens();
    logger.info(`Token deleted for provider: ${provider}`);
  }

  /**
   * Clear all tokens
   */
  async clearAll(): Promise<void> {
    this.tokens.clear();
    await this.persistTokens();
    logger.info('All tokens cleared');
  }

  /**
   * List all stored providers
   */
  listProviders(): string[] {
    return Array.from(this.tokens.keys());
  }

  /**
   * Persist tokens to disk (encrypted)
   */
  private async persistTokens(): Promise<void> {
    await this.ensureStorageDir();

    const tokensArray = Array.from(this.tokens.entries());
    const data = JSON.stringify(tokensArray);
    const encrypted = this.encrypt(data);

    const filePath = path.join(this.storageDir, 'tokens.enc');
    await fs.writeFile(filePath, encrypted);
  }

  /**
   * Load tokens from disk
   */
  private async loadTokens(): Promise<void> {
    const filePath = path.join(this.storageDir, 'tokens.enc');

    try {
      const encrypted = await fs.readFile(filePath);
      const decrypted = this.decrypt(encrypted);
      const tokensArray = JSON.parse(decrypted);

      this.tokens = new Map(tokensArray);
    } catch {
      // File doesn't exist or is corrupted - start fresh
      this.tokens = new Map();
    }
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true, mode: 0o700 });
  }

  /**
   * Get or create encryption key
   * Priority: 1. Environment variable, 2. Existing key file, 3. Generate new key
   */
  private getOrCreateEncryptionKey(): Buffer {
    // First, try to get key from environment variable
    const envKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (envKey) {
      return this.validateAndParseKey(envKey, 'environment variable');
    }

    // If no env key, try to read existing key file
    const keyPath = path.join(os.homedir(), '.oauth-client', 'key');
    try {
      const existingKey = readFileSync(keyPath);
      this.validateKeyLength(existingKey);
      logger.debug('Using existing encryption key from file');
      return existingKey;
    } catch {
      // File doesn't exist or is invalid - generate new key
      return this.generateAndStoreNewKey(keyPath);
    }
  }

  /**
   * Validate and parse encryption key from string
   */
  private validateAndParseKey(keyString: string, source: string): Buffer {
    let key: Buffer;

    // Check if key is prefixed with kdf: for key derivation
    if (keyString.startsWith('kdf:')) {
      // Use PBKDF2 key derivation for enhanced security
      const password = keyString.substring(4); // Remove 'kdf:' prefix
      key = this.deriveKeyFromPassword(password);
      logger.info(`Using KDF-derived encryption key from ${source}`);
    } else {
      // Direct key parsing
      if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
        // Hex format (64 hex chars = 32 bytes)
        key = Buffer.from(keyString, 'hex');
      } else if (/^[A-Za-z0-9+/]{43}=?$/.test(keyString)) {
        // Base64 format
        key = Buffer.from(keyString, 'base64');
      } else {
        // Raw string - ensure it's exactly 32 bytes
        key = Buffer.from(keyString, 'utf8');
      }
      logger.info(`Using encryption key from ${source}`);
    }

    this.validateKeyLength(key);
    return key;
  }

  /**
   * Derive a 32-byte key from a password using PBKDF2
   */
  private deriveKeyFromPassword(password: string): Buffer {
    // Use a fixed salt for deterministic key derivation
    // In production, consider using a configurable salt
    const salt = Buffer.from('oauth-client-salt-v1', 'utf8');
    const iterations = 100000; // OWASP recommended minimum

    return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  }

  /**
   * Validate that key is exactly 32 bytes for AES-256
   */
  private validateKeyLength(key: Buffer): void {
    if (key.length !== 32) {
      throw new Error(
        `Invalid encryption key length: ${key.length} bytes. ` +
          'AES-256-GCM requires exactly 32 bytes (256 bits). ' +
          'Please ensure TOKEN_ENCRYPTION_KEY is a 32-byte key encoded as hex (64 chars) or base64 (44 chars).',
      );
    }
  }

  /**
   * Generate and store a new encryption key
   */
  private generateAndStoreNewKey(keyPath: string): Buffer {
    const key = crypto.randomBytes(32);

    // Warn if we're auto-generating a key in production
    if (process.env.NODE_ENV === 'production') {
      logger.warn(
        '🚨 SECURITY WARNING: Auto-generating encryption key in production environment. ' +
          'For production use, set TOKEN_ENCRYPTION_KEY environment variable with a secure 32-byte key. ' +
          'Current key will be saved to file but consider using proper secret management.',
      );
    } else {
      logger.info('Generated new 32-byte encryption key for token storage');
    }

    // Ensure directory exists with secure permissions
    mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });

    // Store key securely
    writeFileSync(keyPath, key, { mode: 0o600 });

    logger.debug('Encryption key saved to file with secure permissions (600)');
    return key;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(text: string): Buffer {
    const iv = crypto.randomBytes(16); // 128-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Format: [IV (16 bytes)] + [Auth Tag (16 bytes)] + [Encrypted Data]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(buffer: Buffer): string {
    if (buffer.length < 32) {
      throw new Error('Invalid encrypted data: insufficient length');
    }

    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }
}

export default new TokenManager();
