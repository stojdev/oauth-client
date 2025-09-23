import crypto from 'crypto';

interface StateData {
  state: string;
  data?: unknown;
  createdAt: number;
  expiresAt: number;
}

/**
 * Manages OAuth state parameters for security
 */
export class StateManager {
  private states: Map<string, StateData> = new Map();
  private readonly ttl: number = 600000; // 10 minutes default

  constructor(ttl?: number) {
    if (ttl) {
      this.ttl = ttl;
    }

    // Clean up expired states periodically
    setInterval(() => this.cleanup(), 60000); // every minute
  }

  /**
   * Generate and store a new state
   */
  create(data?: unknown): string {
    const state = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    this.states.set(state, {
      state,
      data,
      createdAt: now,
      expiresAt: now + this.ttl,
    });

    return state;
  }

  /**
   * Verify and retrieve state data
   */
  verify(state: string): StateData | null {
    const stateData = this.states.get(state);

    if (!stateData) {
      return null;
    }

    if (Date.now() > stateData.expiresAt) {
      this.states.delete(state);
      return null;
    }

    // Delete after successful verification (one-time use)
    this.states.delete(state);
    return stateData;
  }

  /**
   * Check if state exists without consuming it
   */
  exists(state: string): boolean {
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
}

export default new StateManager();
