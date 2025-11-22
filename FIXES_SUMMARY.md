# Genie Bug Fixes Summary

## Issues Fixed

### 1. **Messages Appending to Single Bubble Instead of Creating New Bubbles**

**Problem**: Agent messages were being duplicated - once from streaming events and once after the stream completed, causing messages to appear in the same bubble instead of separate message bubbles.

**Root Cause**: The `use-chat.ts` hook had two mechanisms for adding agent messages:

1. Real-time streaming via `handleAgentEvent()`
2. A final message creation using `markdownBuffer` after stream completion

This caused the agent's response to be added twice - once correctly via event handlers during streaming, and once more at the end.

**Solution**:

- Removed the `markdownBuffer` logic that was tracking content and creating a duplicate message
- Removed the `handleStreamLine` helper function that was redundant
- Removed the `addAgentMessageToConversations` helper that was adding the duplicate message
- Now only `handleAgentEvent()` processes all events including `TEXT_MESSAGE_CONTENT`

**Files Changed**:

- `genie-frontend/src/hooks/use-chat.ts`

**Code Changes**:

```typescript
// BEFORE: Duplicate message tracking
const markdownBuffer = { value: "" };
const messageId = { value: null as string | null };
// ... 
handleStreamLine(line, sessionId, setConversations, markdownBuffer, messageId);
// ...
if (markdownBuffer.value.trim()) {
  const agentMessage: AnyMessage = {
    id: messageId.value ?? `msg_agent_${Date.now()}`,
    role: "assistant",
    type: "text",
    content: markdownBuffer.value.trim(),
    // ... duplicate message added
  };
  setConversations(prev => addAgentMessageToConversations(prev, sessionId, agentMessage));
}

// AFTER: Single event-driven approach
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const event = JSON.parse(trimmed);
      handleAgentEvent(event, { sessionId, setConversations });
    } catch (err) {
      console.warn("Failed to parse event:", trimmed, err);
    }
  }
}
```

### 2. **Chat Sessions Not Properly Isolated When Switching**

**Problem**: When switching between chat sessions, messages from the previous session's stream would continue appearing in the new session.

**Root Cause**:

1. No tracking of which session a stream belonged to
2. No cleanup/abort when switching sessions
3. Event handlers would process events for any session without checking if it's still active

**Solution**:

- Added `currentSessionRef` to track the active session during streaming
- Added `useEffect` hook to abort ongoing streams when switching sessions
- Update `currentSessionRef` when starting a new stream

**Files Changed**:

- `genie-frontend/src/hooks/use-chat.ts`

**Code Changes**:

```typescript
// Track current session
const currentSessionRef = useRef<string | null>(null);

// Abort stream when switching sessions
useEffect(() => {
  if (activeConversationId && currentSessionRef.current && 
      activeConversationId !== currentSessionRef.current) {
    handleStop(); // Abort ongoing stream
  }
}, [activeConversationId]);

// Set current session ref when starting stream
startTransition(() => {
  const abortController = new AbortController();
  abortControllerRef.current = abortController;
  currentSessionRef.current = sessionId; // Track this session
  // ...
});
```

## How the Event-Driven Architecture Works

### Backend Event Flow

1. **RUN_STARTED**: Agent begins processing
2. **TEXT_MESSAGE_CONTENT** (multiple): Streaming tokens with consistent `messageId`
   - Backend uses same `agentMessageId` for all deltas in one response
   - Frontend checks if `messageId` matches last message:
     - **Match**: Appends delta to existing message
     - **No Match**: Creates new message bubble
3. **TOOL_CALL_START**: Tool execution begins (creates new bubble)
4. **TOOL_COMPLETE**: Tool finished (updates existing tool bubble)
5. **RUN_FINISHED**: Agent completes, finalize all streaming messages

### Frontend Event Handling

The `event-handlers.ts` file contains specialized handlers:

- `handleTextMessageContentEvent()`: Smartly appends or creates message based on `messageId`
- `handleToolCallStartEvent()`: Always creates new tool call bubble
- `handleToolCompleteEvent()`: Updates existing tool bubble with results
- `handleRunFinishedEvent()`: Finalizes all `isStreaming` messages

This architecture ensures:
✅ Each agent response is a single message bubble
✅ Tool calls are separate bubbles
✅ Real-time streaming updates
✅ No duplicate messages
✅ Proper session isolation

## Testing Instructions

### Test 1: Single Message Bubble

1. Start frontend and backend
2. Send a message to the agent
3. **Expected**: Agent response appears as ONE message bubble that fills in gradually
4. **NOT Expected**: Multiple bubbles with the same content

### Test 2: Tool Calls in Separate Bubbles

1. Send a message that triggers tool usage (e.g., "What's the current time?")
2. **Expected**:
   - Tool call appears as separate bubble
   - Agent response appears as separate bubble
3. **NOT Expected**: Tool calls merged into agent message

### Test 3: Session Isolation

1. Create two chat sessions
2. Start streaming a long response in Session 1
3. Quickly switch to Session 2
4. **Expected**:
   - Session 1's stream stops immediately
   - Session 2 is empty and independent
5. **NOT Expected**: Session 1's messages appearing in Session 2

### Test 4: Session Persistence

1. Create a session, send messages
2. Switch to another session
3. Switch back to first session
4. **Expected**: All original messages still present
5. **NOT Expected**: Messages cleared or mixed between sessions

## Technical Details

### Message ID Strategy

The backend generates a consistent `messageId` for all `TEXT_MESSAGE_CONTENT` events in a single agent response:

```typescript
// Backend (langchain-agent.service.ts)
const agentMessageId = `${config.configurable.thread_id}-msg-${messageCounter}`;

// All deltas use the same messageId
yield {
  type: "TEXT_MESSAGE_CONTENT",
  data: {
    messageId: agentMessageId,  // Same ID for all deltas
    delta: tokenBatch,
    content: finalOutput
  }
};
```

### Frontend Message Deduplication

The `handleTextMessageContentEvent` checks for matching IDs:

```typescript
const lastAgentMsg = messages[lastAgentIdx];
if (lastAgentMsg.id === messageId) {
  // Append to existing bubble
  messages = messages.map((m, idx) =>
    idx === lastAgentIdx && m.type === 'text'
      ? { ...m, content: newContent, isStreaming: true }
      : m
  );
} else {
  // Create new bubble
  messages.push({
    id: messageId,
    role: 'assistant',
    type: 'text',
    content: delta || '',
    isStreaming: true
  });
}
```

## Files Modified Summary

### Frontend Files

1. `src/hooks/use-chat.ts` - Fixed duplicate messages, added session tracking
2. `src/lib/event-handlers.ts` - Already had correct logic (no changes needed)
3. `src/lib/session-manager.ts` - Session persistence (already implemented)

### Backend Files

- No changes required - backend was already sending correct events

## Verification

Run TypeScript check to ensure no errors:

```bash
cd genie-frontend
npm run typecheck
```

**Result**: ✅ 0 errors

## Notes

- The event-driven architecture is sound and working correctly
- The issue was in the frontend's duplicate message handling
- Session management now properly isolates conversations
- All streaming is handled by `handleAgentEvent()` - no manual message construction needed
