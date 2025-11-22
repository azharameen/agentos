# Quick Reference: Unified Memory & Agent Coordination

## 🚀 For Developers

### Using UnifiedMemoryService

```typescript
import { UnifiedMemoryService } from './services/unified-memory.service';

constructor(private readonly memory: UnifiedMemoryService) {}

// Add message to session (persistent)
await this.memory.addMessage(sessionId, 'human', 'Hello!');
await this.memory.addMessage(sessionId, 'ai', 'Hi there!');

// Get recent conversation history
const messages = await this.memory.getRecentMessages(sessionId, 10);

// Update session context
await this.memory.updateContext(sessionId, { userId: '123', preferences: {...} });

// Get session context
const context = await this.memory.getContext(sessionId);

// Clear session
await this.memory.clearSession(sessionId);

// List all sessions
const sessions = await this.memory.listSessions();

// Get analytics
const analytics = await this.memory.getMemoryAnalytics();

// Export/Import
const backup = await this.memory.exportMemory();
await this.memory.importMemory(backup);

// Long-term memory
await this.memory.setLongTermMemory('user_preference', 'dark_mode', {
  sessionId,
  category: 'preferences',
  importance: 0.8
});

const value = await this.memory.getLongTermMemory('user_preference', sessionId);
```

### Using AgentCoordinationService

```typescript
import { AgentCoordinationService } from './services/agent-coordination.service';

constructor(private readonly coordination: AgentCoordinationService) {}

// Execute with streaming (recommended)
async *executeAgent(prompt: string, sessionId: string) {
  const stream = this.coordination.executeTaskStream(prompt, sessionId, {
    enabledToolCategories: ['math', 'web'],
    enableRAG: true,
    model: 'gpt-4o'
  });

  for await (const event of stream) {
    switch (event.type) {
      case 'RUN_STARTED':
        console.log('Started:', event.data);
        break;
      case 'CONTEXT':
        console.log('RAG Context:', event.data);
        break;
      case 'RUN_FINISHED':
        console.log('Result:', event.data.output);
        return event.data;
      case 'RUN_ERROR':
        console.error('Error:', event.data.error);
        throw new Error(event.data.error);
    }
  }
}
```

### API Endpoints

#### Execute Agent (Streaming)

```bash
POST /agent/execute
Content-Type: application/json

{
  "prompt": "What is 2 + 2?",
  "sessionId": "session-123",
  "enabledToolCategories": ["math"],
  "enableRAG": false,
  "model": "gpt-4o"
}
```

#### Memory Analytics

```bash
GET /memory/analytics

Response:
{
  "sessions": {
    "total": 5,
    "avgMessagesPerSession": 8.2,
    "totalMessages": 41
  },
  "longTermMemory": {
    "total": 12,
    "totalSizeBytes": 4096
  },
  "systemHealth": {
    "cacheSize": 3,
    "memoryPressure": "low"
  }
}
```

#### List Sessions

```bash
GET /memory/sessions

Response:
["session-1", "session-2", "session-3"]
```

#### Export Memory (Backup)

```bash
GET /memory/export

Response:
{
  "exportedAt": "2025-11-20T23:30:00.000Z",
  "sessions": [...],
  "longTermMemory": [...]
}
```

#### Import Memory (Restore)

```bash
POST /memory/import
Content-Type: application/json

{
  "sessions": [...],
  "longTermMemory": [...]
}

Response:
{
  "sessionsImported": 5,
  "messagesImported": 41,
  "longTermMemoryImported": 12,
  "errors": []
}
```

#### Clear Session

```bash
DELETE /memory/sessions/:sessionId

Response: 200 OK
```

### Migration from Old Services

#### AgentMemoryService → UnifiedMemoryService

```typescript
// BEFORE (in-memory, non-persistent)
this.memory.addMessage(sessionId, 'human', 'Hello');  // Sync
const messages = this.memory.getConversationHistory(sessionId);  // Sync

// AFTER (persistent SQLite storage)
await this.memory.addMessage(sessionId, 'human', 'Hello');  // Async
const messages = await this.memory.getRecentMessages(sessionId, 10);  // Async
```

#### AgentOrchestratorService → AgentCoordinationService

```typescript
// BEFORE
const stream = this.orchestrator.executeTaskStream(prompt, sessionId, options);

// AFTER
const stream = this.coordination.executeTaskStream(prompt, sessionId, options);
```

### Environment Variables

```bash
# Azure OpenAI (Required)
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=text-embedding-ada-002

# Memory Configuration
MEMORY_SESSION_TIMEOUT_MS=1800000  # 30 minutes (default)
MEMORY_CACHE_SIZE_LIMIT=100  # Max sessions in cache (default)

# Database
DATA_DIR=./data  # Where unified_memory.db is stored (default)

# Optional Features
ENABLE_HNSW_INDEX=false  # ANN search for RAG (default: false)
CONTENT_SAFETY_ENABLED=false  # Content moderation (default: false)
LANGCHAIN_TRACING_V2=false  # LangSmith observability (default: false)
```

### Database Location

- **Path**: `data/unified_memory.db`
- **Format**: SQLite 3
- **Mode**: WAL (Write-Ahead Logging)
- **Tables**:
  - `session_messages` - Conversation history
  - `session_context` - Session metadata
  - `long_term_memory` - Persistent facts/preferences
  - `workflow_checkpoints` - LangGraph state
  - `memory_summaries` - Summarized conversations

### Performance Tips

1. **Use caching wisely**: First 100 sessions cached in memory
2. **Set appropriate timeouts**: Stale sessions cleaned every 30 minutes
3. **Enable HNSW for large RAG**: If >10k documents, set `ENABLE_HNSW_INDEX=true`
4. **Monitor memory pressure**: Check `/memory/analytics` regularly
5. **Batch operations**: Group multiple queries when possible

### Debugging

```typescript
// Enable detailed logging
const logger = new Logger('YourService');

// Check memory stats
const analytics = await this.memory.getMemoryAnalytics();
logger.log('Memory stats:', analytics);

// Verify session exists
const sessions = await this.memory.listSessions();
logger.log('Active sessions:', sessions);

// Check database file
// Location: data/unified_memory.db
// Use sqlite3 CLI or DB Browser for SQLite to inspect
```

### Common Issues

1. **"Database not initialized" error**
   - Wait for `OnModuleInit` to complete
   - Check DATA_DIR environment variable
   - Verify write permissions on data/ directory

2. **Memory not persisting**
   - Ensure all operations are `await`ed
   - Check for SQLite errors in logs
   - Verify database file exists: `data/unified_memory.db`

3. **Slow queries**
   - Check indexes are created (run schema creation)
   - Monitor cache size in analytics
   - Consider enabling HNSW for large datasets

4. **Circuit breaker warnings**
   - Normal in development mode
   - Enable CircuitBreakerService in production
   - Configure timeouts and retry policies

### Testing

```typescript
// Unit test example
describe('UnifiedMemoryService', () => {
  let service: UnifiedMemoryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UnifiedMemoryService, ConfigService],
    }).compile();

    service = module.get<UnifiedMemoryService>(UnifiedMemoryService);
    await service.onModuleInit();
  });

  it('should persist messages', async () => {
    await service.addMessage('test-session', 'human', 'Hello');
    const messages = await service.getRecentMessages('test-session', 1);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Hello');
  });
});
```

---

## 📚 Additional Resources

- **Full Migration Guide**: `MIGRATION_COMPLETE_UNIFIED_MEMORY.md`
- **Master Documentation**: `GENIE_MASTER_DOCUMENTATION.md`
- **API Reference**: Swagger UI at `http://localhost:3001/api`
- **Source Code**:
  - `src/agent/services/unified-memory.service.ts`
  - `src/agent/services/agent-coordination.service.ts`
  - `src/agent/agent.module.ts`

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
**Status**: ✅ Production Ready
