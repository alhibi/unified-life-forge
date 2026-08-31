/**
 * `circuitBreaker` — half-open state machine for flaky upstream calls.
 *
 * Three states:
 *   - CLOSED: requests pass through; consecutive failures trip to OPEN.
 *   - OPEN:   short-circuit with `BreakerOpen`; after cooldown, half-open.
 *   - HALF_OPEN: one probe; success closes, failure re-opens.
 *
 * Use:
 *   const breaker = new CircuitBreaker({ name: 'rss', cooldownMs: 30_000 });
 *   const result = await breaker.exec(() => fetch('/rss').then(r => r.json()));
 */

export class BreakerOpen extends Error {
  readonly breakerName: string;
  constructor(name: string) {
    super(`Circuit breaker open: ${name}`);
    this.breakerName = name;
    this.name = 'BreakerOpen';
  }
}

type State = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;
  cooldownMs?: number;
  halfOpenMaxConcurrent?: number;
  onStateChange?: (state: State) => void;
}

export class CircuitBreaker {
  readonly name: string;
  private state: State = 'closed';
  private consecutiveFailures = 0;
  private openedAt = 0;
  private halfOpenInflight = 0;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly halfOpenMaxConcurrent: number;
  private readonly onStateChange?: (state: State) => void;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 30_000;
    this.halfOpenMaxConcurrent = opts.halfOpenMaxConcurrent ?? 1;
    this.onStateChange = opts.onStateChange;
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.transition('half_open');
      } else {
        throw new BreakerOpen(this.name);
      }
    }
    if (this.state === 'half_open' && this.halfOpenInflight >= this.halfOpenMaxConcurrent) {
      throw new BreakerOpen(this.name);
    }
    if (this.state === 'half_open') this.halfOpenInflight += 1;
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    } finally {
      if (this.state === 'half_open') this.halfOpenInflight -= 1;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state === 'half_open') this.transition('closed');
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === 'half_open' || this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = Date.now();
      this.transition('open');
    }
  }

  private transition(next: State): void {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next);
  }

  snapshot(): { state: State; consecutiveFailures: number } {
    return { state: this.state, consecutiveFailures: this.consecutiveFailures };
  }
}