import crypto from 'crypto';

interface StateData {
  state: string;
  data?: unknown;
  createdAt: number;
  expiresAt: number;
  sessionId?: string; // Optional session binding
}

/**
 * Manages OAuth state parameters for CSRF protection
 * Implements RFC 9700 security requirements:
 * - Cryptographically secure state generation
 * - Mandatory state validation
 * - Short expiration times (5-10 minutes)
 * - One-time use tokens
 * - Session binding capabilities
 */
export class StateManager {
  private states: Map<string, StateData> = new Map();
  private readonly ttl: number = 300000; // 5 minutes (RFC 9700 recommends short expiration)
  private readonly maxStates = 1000; // Prevent memory exhaustion

  constructor(ttl?: number) {
    if (ttl) {
      if (ttl > 600000) {
        // Max 10 minutes
        throw new Error('State TTL cannot exceed 10 minutes for security reasons');
      }
      if (ttl < 60000) {
        // Min 1 minute
        throw new Error('State TTL cannot be less than 1 minute');
      }
      this.ttl = ttl;
    }

    // Clean up expired states more frequently for security
    setInterval(() => this.cleanup(), 30000); // every 30 seconds
  }

  /**
   * Generate and store a new cryptographically secure state
   * Implements RFC 9700 requirements for CSRF protection
   */
  create(data?: unknown, sessionId?: string): string {
    // Prevent memory exhaustion attacks
    if (this.states.size >= this.maxStates) {
      this.cleanup();
      if (this.states.size >= this.maxStates) {
        throw new Error('Too many active states - possible DoS attack');
      }
    }

    // Generate cryptographically secure state (minimum 128 bits entropy)
    const state = crypto.randomBytes(32).toString('hex'); // 256 bits
    const now = Date.now();

    this.states.set(state, {
      state,
      data,
      createdAt: now,
      expiresAt: now + this.ttl,
      sessionId,
    });

    return state;
  }

  /**
   * Verify and retrieve state data with enhanced security checks
   * Implements one-time use and session binding
   */
  verify(state: string, sessionId?: string): StateData | null {
    if (!state || typeof state !== 'string') {
      return null;
    }

    // State must be hex string of expected length (64 chars for 32 bytes)
    if (!/^[0-9a-f]{64}$/i.test(state)) {
      return null;
    }

    const stateData = this.states.get(state);

    if (!stateData) {
      return null;
    }

    if (Date.now() > stateData.expiresAt) {
      this.states.delete(state);
      return null;
    }

    // Optional session binding check
    if (sessionId && stateData.sessionId && stateData.sessionId !== sessionId) {
      this.states.delete(state);
      return null;
    }

    // Delete after successful verification (one-time use - critical for security)
    this.states.delete(state);
    return stateData;
  }

  /**
   * Check if state exists without consuming it
   * WARNING: This method should be avoided in favor of verify()
   * to prevent TOCTOU (Time-of-Check-Time-of-Use) vulnerabilities
   * @deprecated Use verify() instead for atomic check-and-consume
   */
  exists(state: string): boolean {
    if (!state || typeof state !== 'string') {
      return false;
    }

    // State must be hex string of expected length
    if (!/^[0-9a-f]{64}$/i.test(state)) {
      return false;
    }

    const stateData = this.states.get(state);

    if (!stateData) {
      return false;
    }

    if (Date.now() > stateData.expiresAt) {
      this.states.delete(state);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired states
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [state, data] of this.states.entries()) {
      if (now > data.expiresAt) {
        this.states.delete(state);
      }
    }
  }

  /**
   * Clear all states
   */
  clear(): void {
    this.states.clear();
  }

  /**
   * Get the number of active states
   */
  get size(): number {
    return this.states.size;
  }

  /**
   * Get security metrics for monitoring
   */
  getMetrics(): {
    activeStates: number;
    maxStates: number;
    ttlMinutes: number;
    oldestStateAge: number;
  } {
    const now = Date.now();
    let oldestAge = 0;

    for (const stateData of this.states.values()) {
      const age = now - stateData.createdAt;
      if (age > oldestAge) {
        oldestAge = age;
      }
    }

    return {
      activeStates: this.states.size,
      maxStates: this.maxStates,
      ttlMinutes: this.ttl / 60000,
      oldestStateAge: oldestAge,
    };
  }

  /**
   * Create state with session binding for enhanced security
   */
  createWithSession(sessionId: string, data?: unknown): string {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID is required for session-bound state');
    }
    return this.create(data, sessionId);
  }
}

// Export singleton instance with secure defaults (5 minute TTL)
export default new StateManager();
