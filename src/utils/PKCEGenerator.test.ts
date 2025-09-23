import { describe, it, expect } from '@jest/globals';
import {
  generateRandomString,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEChallenge,
  base64UrlEncode,
  generateState,
  generateNonce,
} from './PKCEGenerator';

describe('PKCEGenerator', () => {
  describe('generateRandomString', () => {
    it('should generate a string of the specified length', () => {
      const result = generateRandomString(32);
      expect(result).toHaveLength(32);
    });

    it('should only contain valid characters', () => {
      const result = generateRandomString(100);
      const validChars = /^[A-Za-z0-9\-._~]+$/;
      expect(result).toMatch(validChars);
    });
  });

  describe('generateCodeVerifier', () => {
    it('should generate a verifier of default length 128', () => {
      const result = generateCodeVerifier();
      expect(result).toHaveLength(128);
    });

    it('should generate a verifier of specified length', () => {
      const result = generateCodeVerifier(43);
      expect(result).toHaveLength(43);
    });

    it('should throw error for invalid length', () => {
      expect(() => generateCodeVerifier(42)).toThrow();
      expect(() => generateCodeVerifier(129)).toThrow();
    });
  });

  describe('generateCodeChallenge', () => {
    it('should reject plain method per RFC 9700', () => {
      const verifier = 'test-verifier';
      expect(() => {
        // @ts-expect-error Testing runtime rejection of insecure method
        generateCodeChallenge(verifier, 'plain');
      }).toThrow(/Only S256 code challenge method is allowed per RFC 9700/);
    });

    it('should return base64url encoded SHA256 for S256 method', () => {
      const verifier = 'test-verifier';
      const result = generateCodeChallenge(verifier, 'S256');
      expect(result).toBeDefined();
      expect(result).not.toBe(verifier);
      // Should be base64url encoded (no +, /, or =)
      expect(result).not.toMatch(/[+/=]/);
    });
  });

  describe('generatePKCEChallenge', () => {
    it('should generate a complete PKCE challenge', () => {
      const result = generatePKCEChallenge();
      expect(result).toHaveProperty('codeVerifier');
      expect(result).toHaveProperty('codeChallenge');
      expect(result).toHaveProperty('method');
      expect(result.method).toBe('S256');
    });

    it('should reject plain method per RFC 9700', () => {
      expect(() => {
        // @ts-expect-error Testing runtime rejection of insecure method
        generatePKCEChallenge('plain');
      }).toThrow(/Only S256 code challenge method is allowed per RFC 9700/);
    });

    it('should only support S256 method', () => {
      const result = generatePKCEChallenge();
      expect(result.method).toBe('S256');
      expect(result.codeChallenge).not.toBe(result.codeVerifier);
      expect(result.codeChallenge.length).toBeGreaterThan(0);
    });
  });

  describe('base64UrlEncode', () => {
    it('should encode string to base64url', () => {
      const result = base64UrlEncode('test');
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should encode buffer to base64url', () => {
      const buffer = Buffer.from('test');
      const result = base64UrlEncode(buffer);
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });
  });

  describe('generateState', () => {
    it('should generate a state of default length 32', () => {
      const result = generateState();
      expect(result).toHaveLength(32);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('generateNonce', () => {
    it('should generate a nonce of default length 32', () => {
      const result = generateNonce();
      expect(result).toHaveLength(32);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });
});
