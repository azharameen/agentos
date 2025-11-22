import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AgentMemoryService } from "./agent-memory.service";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

describe("AgentMemoryService", () => {
  let service: AgentMemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentMemoryService, ConfigService],
    }).compile();

    service = module.get<AgentMemoryService>(AgentMemoryService);
  });

  afterEach(() => {
    // Clean up all sessions
    const sessions = service.getAllSessions();
    sessions.forEach((sessionId) => service.clearSession(sessionId));
  });

  describe("Session Management", () => {
    it("should create a new session", () => {
      const sessionId = "test-session-1";
      const session = service.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(sessionId);
      expect(session.conversationHistory).toEqual([]);
      expect(session.context).toEqual({});
    });

    it("should return existing session if already created", () => {
      const sessionId = "test-session-2";
      const session1 = service.getSession(sessionId);
      const session2 = service.getSession(sessionId);

      expect(session1).toBe(session2);
    });

    it("should clear a session", () => {
      const sessionId = "test-session-3";
      service.getSession(sessionId);
      service.addMessage(sessionId, "human", "Hello");

      service.clearSession(sessionId);
      const newSession = service.getSession(sessionId);

      expect(newSession.conversationHistory).toEqual([]);
    });
  });

  describe("Message Management", () => {
    it("should add human message to session", () => {
      const sessionId = "test-session-4";
      const content = "Hello, AI!";

      service.addMessage(sessionId, "human", content);
      const history = service.getConversationHistory(sessionId);

      expect(history).toHaveLength(1);
      expect(history[0]).toBeInstanceOf(HumanMessage);
      expect((history[0] as HumanMessage).content).toBe(content);
    });

    it("should add AI message to session", () => {
      const sessionId = "test-session-5";
      const content = "Hello, human!";

      service.addMessage(sessionId, "ai", content);
      const history = service.getConversationHistory(sessionId);

      expect(history).toHaveLength(1);
      expect(history[0]).toBeInstanceOf(AIMessage);
      expect((history[0] as AIMessage).content).toBe(content);
    });

    it("should get recent history with limit", () => {
      const sessionId = "test-session-6";

      for (let i = 0; i < 20; i++) {
        service.addMessage(sessionId, "human", `Message ${i}`);
      }

      const recentHistory = service.getRecentHistory(sessionId, 5);
      expect(recentHistory).toHaveLength(5);
      expect((recentHistory[4] as HumanMessage).content).toBe("Message 19");
    });
  });

  describe("Context Management", () => {
    it("should update session context", () => {
      const sessionId = "test-session-7";
      const context = { userId: "123", preference: "dark-mode" };

      service.updateContext(sessionId, context);
      const retrievedContext = service.getContext(sessionId);

      expect(retrievedContext).toEqual(context);
    });

    it("should merge context updates", () => {
      const sessionId = "test-session-8";

      service.updateContext(sessionId, { key1: "value1" });
      service.updateContext(sessionId, { key2: "value2" });

      const context = service.getContext(sessionId);
      expect(context).toEqual({ key1: "value1", key2: "value2" });
    });
  });

  describe("Long-term Memory", () => {
    it("should add long-term memory entry", () => {
      const content = "Important fact";
      const metadata = { source: "user-input" };

      const id = service.addToLongTermMemory(content, metadata);

      expect(id).toBeDefined();
      expect(id).toMatch(/^ltm_/);

      const entry = service.getLongTermMemory(id);
      expect(entry).toBeDefined();
      expect(entry?.content).toBe(content);
      expect(entry?.metadata).toEqual(metadata);
    });

    it("should search long-term memory", () => {
      service.addToLongTermMemory("Paris is the capital of France", {
        topic: "geography",
      });
      service.addToLongTermMemory("Rome is the capital of Italy", {
        topic: "geography",
      });
      service.addToLongTermMemory("Python is a programming language", {
        topic: "tech",
      });

      const results = service.searchLongTermMemory("capital");
      expect(results).toHaveLength(2);
    });

    it("should delete long-term memory entry", () => {
      const id = service.addToLongTermMemory("Test entry");

      const deleted = service.deleteLongTermMemory(id);
      expect(deleted).toBe(true);

      const entry = service.getLongTermMemory(id);
      expect(entry).toBeUndefined();
    });
  });

  describe("Memory Analytics", () => {
    it("should return memory statistics", () => {
      service.getSession("session-1");
      service.addMessage("session-1", "human", "Hello");
      service.addMessage("session-1", "ai", "Hi");

      service.addToLongTermMemory("Fact 1");
      service.addToLongTermMemory("Fact 2");

      const stats = service.getMemoryStats();

      expect(stats.activeSessions).toBe(1);
      expect(stats.totalMessages).toBe(2);
      expect(stats.longTermEntries).toBe(2);
    });

    it("should return detailed analytics", () => {
      service.getSession("session-analytics");
      service.addMessage("session-analytics", "human", "Test");

      const analytics = service.getMemoryAnalytics();

      expect(analytics.sessions.total).toBeGreaterThan(0);
      expect(analytics.sessions.totalMessages).toBeGreaterThan(0);
      expect(analytics.systemHealth.memoryPressure).toBe("low");
    });
  });

  describe("Memory Export/Import", () => {
    it("should export memory data", () => {
      const sessionId = "export-test";
      service.addMessage(sessionId, "human", "Export me");
      service.addMessage(sessionId, "ai", "Exporting");
      service.addToLongTermMemory("LTM entry");

      const exported = service.exportMemory();

      expect(exported.exportedAt).toBeInstanceOf(Date);
      expect(exported.sessions).toHaveLength(1);
      expect(exported.sessions[0].sessionId).toBe(sessionId);
      expect(exported.longTermMemory.length).toBeGreaterThan(0);
    });

    it("should import memory data", () => {
      const data = {
        sessions: [
          {
            sessionId: "imported-session",
            conversationHistory: [
              { type: "human", content: "Hello" },
              { type: "ai", content: "Hi there" },
            ],
            context: { imported: true },
            createdAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
          },
        ],
        longTermMemory: [
          {
            id: "ltm_imported",
            content: "Imported fact",
            metadata: {},
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const result = service.importMemory(data);

      expect(result.sessionsImported).toBe(1);
      expect(result.longTermMemoryImported).toBe(1);
      expect(result.errors).toEqual([]);

      const history = service.getConversationHistory("imported-session");
      expect(history).toHaveLength(2);
    });
  });

  describe("Memory Pruning", () => {
    it("should prune sessions by max count", () => {
      for (let i = 0; i < 10; i++) {
        service.getSession(`session-${i}`);
      }

      const result = service.pruneMemory({ maxSessions: 5 });

      expect(result.sessionsPruned).toBe(5);
      expect(service.getAllSessions()).toHaveLength(5);
    });

    it("should prune messages per session", () => {
      const sessionId = "prune-messages";

      for (let i = 0; i < 100; i++) {
        service.addMessage(sessionId, "human", `Message ${i}`);
      }

      const result = service.pruneMemory({ maxMessagesPerSession: 10 });

      expect(result.messagesPruned).toBe(90);
      const history = service.getConversationHistory(sessionId);
      expect(history).toHaveLength(10);
    });

    it("should prune long-term memory by max count", () => {
      for (let i = 0; i < 20; i++) {
        service.addToLongTermMemory(`Entry ${i}`);
      }

      const result = service.pruneMemory({ maxLongTermEntries: 10 });

      expect(result.longTermEntriesPruned).toBe(10);
    });

    it("should prune sessions by age", () => {
      const sessionId = "old-session";
      service.getSession(sessionId);

      // Simulate old session by manually setting lastAccessedAt
      const session = service.getSession(sessionId);
      (session as any).lastAccessedAt = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ); // 10 days ago

      const result = service.pruneMemory({ keepRecentDays: 7 });

      expect(result.sessionsPruned).toBeGreaterThan(0);
    });
  });
});
