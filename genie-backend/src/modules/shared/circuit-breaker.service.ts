import { Injectable, Logger } from "@nestjs/common";

/**
 * Circuit state
 */
export enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Circuit is open, requests fail fast
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes in HALF_OPEN to close
  timeout: number; // Time in ms before attempting to close
  resetTimeout: number; // Time in ms to stay in OPEN before HALF_OPEN
}

/**
 * Circuit breaker statistics
 */
interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  openedAt?: number;
  halfOpenedAt?: number;
}

/**
 * Circuit Breaker Service
 * 
 * Implements the Circuit Breaker pattern to protect against cascading failures
 * when calling external services (Azure OpenAI).
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail fast without calling service
 * - HALF_OPEN: Testing recovery, limited requests allowed
 * 
 * PERFORMANCE IMPACT: Prevents cascading failures, improves resilience
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitStats>();
  private readonly configs = new Map<string, CircuitBreakerConfig>();

  // Default configuration
  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5, // Open after 5 failures
    successThreshold: 2, // Close after 2 successes in HALF_OPEN
    timeout: 60000, // 60 seconds timeout
    resetTimeout: 30000, // 30 seconds before trying HALF_OPEN
  };

  /**
   * Register a new circuit breaker
   */
  registerCircuit(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
  ): void {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    this.configs.set(name, finalConfig);
    this.circuits.set(name, {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    });
    this.logger.log(`Circuit breaker registered: ${name}`, finalConfig);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);

    if (!circuit || !config) {
      throw new Error(`Circuit breaker not registered: ${circuitName}`);
    }

    circuit.totalRequests++;

    // Check circuit state
    if (circuit.state === CircuitState.OPEN) {
      const now = Date.now();
      const timeSinceOpen = now - (circuit.openedAt || 0);

      // Check if we should try HALF_OPEN
      if (timeSinceOpen >= config.resetTimeout) {
        this.transitionTo(circuitName, CircuitState.HALF_OPEN);
      } else {
        // Circuit is still open, fail fast
        this.logger.warn(
          `Circuit ${circuitName} is OPEN, failing fast (${Math.round(timeSinceOpen / 1000)}s since opened)`,
        );
        if (fallback) {
          return await fallback();
        }
        throw new Error(
          `Circuit breaker is OPEN for ${circuitName}. Service unavailable.`,
        );
      }
    }

    // CLOSED or HALF_OPEN: Try the request
    try {
      const result = await Promise.race([
        fn(),
        this.timeout(config.timeout),
      ]);

      // Success!
      this.onSuccess(circuitName);
      return result as T;
    } catch (error) {
      // Failure
      this.onFailure(circuitName);

      if (fallback) {
        this.logger.warn(
          `Circuit ${circuitName} request failed, using fallback`,
        );
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Record a successful request
   */
  private onSuccess(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);

    if (!circuit || !config) return;

    circuit.successes++;
    circuit.totalSuccesses++;
    circuit.lastSuccessTime = Date.now();
    circuit.failures = 0; // Reset failure counter on success

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Check if we've had enough successes to close
      if (circuit.successes >= config.successThreshold) {
        this.transitionTo(circuitName, CircuitState.CLOSED);
      }
    }
  }

  /**
   * Record a failed request
   */
  private onFailure(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);

    if (!circuit || !config) return;

    circuit.failures++;
    circuit.totalFailures++;
    circuit.lastFailureTime = Date.now();
    circuit.successes = 0; // Reset success counter on failure

    // Check if we should open the circuit
    if (
      circuit.state === CircuitState.CLOSED &&
      circuit.failures >= config.failureThreshold
    ) {
      this.transitionTo(circuitName, CircuitState.OPEN);
    } else if (circuit.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately reopens
      this.transitionTo(circuitName, CircuitState.OPEN);
    }
  }

  /**
   * Transition circuit to a new state
   */
  private transitionTo(circuitName: string, newState: CircuitState): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    const oldState = circuit.state;
    circuit.state = newState;
    circuit.failures = 0;
    circuit.successes = 0;

    if (newState === CircuitState.OPEN) {
      circuit.openedAt = Date.now();
      this.logger.warn(
        `Circuit ${circuitName}: ${oldState} → OPEN (${circuit.totalFailures} total failures)`,
      );
    } else if (newState === CircuitState.HALF_OPEN) {
      circuit.halfOpenedAt = Date.now();
      this.logger.log(
        `Circuit ${circuitName}: ${oldState} → HALF_OPEN (testing recovery)`,
      );
    } else if (newState === CircuitState.CLOSED) {
      this.logger.log(
        `Circuit ${circuitName}: ${oldState} → CLOSED (service recovered)`,
      );
    }
  }

  /**
   * Get circuit statistics
   */
  getStats(circuitName: string): CircuitStats | undefined {
    return this.circuits.get(circuitName);
  }

  /**
   * Get all circuit statistics
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    for (const [name, circuit] of this.circuits.entries()) {
      stats[name] = circuit;
    }
    return stats;
  }

  /**
   * Manually reset a circuit
   */
  reset(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    this.logger.log(`Circuit ${circuitName} manually reset to CLOSED`);
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timeout after ${ms}ms`)),
        ms,
      ),
    );
  }
}
