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
   */
  private getOrCreateEncryptionKey(): Buffer {
    const keyPath = path.join(os.homedir(), '.oauth-client', 'key');

    try {
      // Try to read existing key
      const key = readFileSync(keyPath);
      return key;
    } catch {
      // Generate new key
      const key = crypto.randomBytes(32);

      // Ensure directory exists
      mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
      writeFileSync(keyPath, key, { mode: 0o600 });

      return key;
    }
  }

  /**
   * Encrypt data
   */
  private encrypt(text: string): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt data
   */
  private decrypt(buffer: Buffer): string {
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }
}

export default new TokenManager();
