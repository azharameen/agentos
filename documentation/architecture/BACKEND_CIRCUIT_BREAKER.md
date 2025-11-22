# Circuit Breaker Implementation

## Overview

Circuit Breaker pattern implemented for Azure OpenAI calls to prevent cascading failures and improve system resilience.

## Implementation

### Circuit States

1. **CLOSED** - Normal operation, all requests pass through
2. **OPEN** - Too many failures, requests fail fast without calling service
3. **HALF_OPEN** - Testing recovery, limited requests allowed

### Configuration

- **failureThreshold**: 5 failures before opening circuit
- **successThreshold**: 2 successes in HALF_OPEN to close circuit
- **timeout**: 30 seconds request timeout
- **resetTimeout**: 60 seconds before trying HALF_OPEN from OPEN

### Services Protected

1. **azure-openai-langchain** - LangChain LLM invocations
2. **azure-openai-sdk** - Direct OpenAI SDK calls

## Usage

### In AzureOpenAIAdapter

```typescript
// Protected LLM invocation
const result = await this.azureAdapter.invokeLLM(
  llm,
  async (llm) => await llm.invoke(messages),
  () => ({ fallback: "Service temporarily unavailable" }) // Optional fallback
);

// Protected SDK client invocation
const result = await this.azureAdapter.invokeClient(
  client,
  async (client) => await client.chat.completions.create(...),
  () => ({ fallback: "Service temporarily unavailable" })
);
```

### Circuit Statistics

View circuit breaker stats via health endpoint:

```bash
GET /health
```

Response includes:

```json
{
  "circuitBreakers": {
    "langchain": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 42,
      "totalRequests": 42,
      "totalFailures": 0,
      "totalSuccesses": 42
    },
    "sdk": {
      "state": "CLOSED",
      "failures": 0,
      "successes": 15,
      "totalRequests": 15,
      "totalFailures": 0,
      "totalSuccesses": 15
    }
  }
}
```

## Benefits

1. **Prevents Cascading Failures** - Stops calling failing service immediately
2. **Fast Failure** - Returns error quickly instead of waiting for timeout
3. **Automatic Recovery Testing** - Periodically checks if service recovered
4. **Fallback Support** - Optional fallback values during outages
5. **Observability** - Circuit state and statistics available via health checks

## Monitoring

- Circuit state transitions logged at WARN level
- Success/failure counts tracked
- Health endpoint shows current circuit state
- Kubernetes readiness probe unaffected (checks pool availability only)

## Performance Impact

- **Positive**: Reduces latency during outages (fail fast vs. timeout)
- **Positive**: Reduces load on failing service (gives time to recover)
- **Minimal overhead**: <1ms per request when circuit CLOSED
- **Zero overhead**: When circuit OPEN (immediate rejection)

## Testing

1. Simulate Azure OpenAI failures (invalid credentials, network issues)
2. Observe circuit opening after 5 failures
3. Wait 60 seconds, observe HALF_OPEN state
4. Successful requests close circuit back to CLOSED
5. Health endpoint reflects circuit state in real-time

## Future Enhancements

- Per-model circuit breakers (different thresholds for different models)
- Adaptive thresholds based on success rate
- Circuit breaker metrics export (Prometheus)
- Manual circuit control endpoint (force open/close for maintenance)
