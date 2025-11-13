import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";

describe("Agent API (e2e)", () => {
  let app: INestApplication<App>;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Health & Status Endpoints", () => {
    it("/health (GET) - should return healthy status", () => {
      return request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe("ok");
        });
    });

    it("/agent/content-safety/status (GET) - should return content safety config", () => {
      return request(app.getHttpServer())
        .get("/agent/content-safety/status")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("enabled");
          expect(res.body).toHaveProperty("thresholds");
        });
    });
  });

  describe("Memory Management Endpoints", () => {
    it("/agent/memory/analytics (GET) - should return memory analytics", () => {
      return request(app.getHttpServer())
        .get("/agent/memory/analytics")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("sessions");
          expect(res.body).toHaveProperty("longTermMemory");
          expect(res.body).toHaveProperty("systemHealth");
        });
    });

    it("/agent/memory/sessions (GET) - should list active sessions", () => {
      return request(app.getHttpServer())
        .get("/agent/memory/sessions")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("sessions");
          expect(res.body).toHaveProperty("count");
          expect(Array.isArray(res.body.sessions)).toBe(true);
        });
    });

    it("/agent/memory/export (GET) - should export memory", () => {
      return request(app.getHttpServer())
        .get("/agent/memory/export")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("exportedAt");
          expect(res.body).toHaveProperty("sessions");
          expect(res.body).toHaveProperty("longTermMemory");
        });
    });

    it("/agent/memory/prune (POST) - should prune memory", () => {
      return request(app.getHttpServer())
        .post("/agent/memory/prune")
        .send({
          maxSessions: 100,
          maxMessagesPerSession: 50,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("sessionsPruned");
          expect(res.body).toHaveProperty("messagesPruned");
          expect(res.body).toHaveProperty("longTermEntriesPruned");
        });
    });
  });

  describe("RAG Endpoints", () => {
    it("/agent/rag/stats (GET) - should return RAG statistics", () => {
      return request(app.getHttpServer())
        .get("/agent/rag/stats")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("documentCount");
          expect(res.body).toHaveProperty("storeInitialized");
        });
    });

    it("/agent/rag/documents (POST) - should add documents", async () => {
      const response = await request(app.getHttpServer())
        .post("/agent/rag/documents")
        .send({
          documents: [
            {
              pageContent: "Test document content",
              metadata: { source: "e2e-test" },
            },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty("addedCount");
      expect(response.body.addedCount).toBe(1);
    });

    it("/agent/rag/query (POST) - should query documents", async () => {
      // First add a document
      await request(app.getHttpServer())
        .post("/agent/rag/documents")
        .send({
          documents: [
            {
              pageContent: "Paris is the capital of France",
              metadata: { source: "geography" },
            },
          ],
        });

      // Then query
      const response = await request(app.getHttpServer())
        .post("/agent/rag/query")
        .send({
          query: "What is the capital of France?",
          topK: 3,
        })
        .expect(200);

      expect(response.body).toHaveProperty("response");
      expect(response.body).toHaveProperty("retrievedDocuments");
    });

    it("/agent/rag/query-with-provenance (POST) - should return provenance", async () => {
      const response = await request(app.getHttpServer())
        .post("/agent/rag/query-with-provenance")
        .send({
          query: "test query",
          topK: 3,
        })
        .expect(200);

      expect(response.body).toHaveProperty("query");
      expect(response.body).toHaveProperty("results");
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("parameters");
    });
  });

  describe("Content Safety Endpoints", () => {
    it("/agent/content-safety/analyze (POST) - should analyze text", () => {
      return request(app.getHttpServer())
        .post("/agent/content-safety/analyze")
        .send({
          text: "This is a safe test message",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("safe");
          expect(res.body).toHaveProperty("violations");
          expect(res.body).toHaveProperty("analysisTime");
        });
    });
  });

  describe("Agent Execution", () => {
    it("/agent/execute (POST) - should execute simple agentic task", async () => {
      const response = await request(app.getHttpServer())
        .post("/agent/execute")
        .send({
          prompt: "What is 2 + 2?",
          enabledToolCategories: ["math"],
        })
        .expect(200);

      expect(response.body).toHaveProperty("output");
      expect(response.body).toHaveProperty("sessionId");
      expect(response.body).toHaveProperty("model");

      sessionId = response.body.sessionId;
    }, 30000); // 30s timeout for LLM call

    it("/agent/execute (POST) - should maintain session context", async () => {
      if (!sessionId) {
        // Skip if previous test failed
        return;
      }

      const response = await request(app.getHttpServer())
        .post("/agent/execute")
        .send({
          prompt: "What was my previous question?",
          sessionId,
        })
        .expect(200);

      expect(response.body.output).toBeDefined();
    }, 30000);
  });

  describe("Error Handling", () => {
    it("/agent/execute (POST) - should handle missing prompt", () => {
      return request(app.getHttpServer())
        .post("/agent/execute")
        .send({})
        .expect(400);
    });

    it("/agent/rag/documents (POST) - should validate document structure", () => {
      return request(app.getHttpServer())
        .post("/agent/rag/documents")
        .send({
          documents: "invalid",
        })
        .expect(400);
    });

    it("/agent/memory/session/:id (DELETE) - should handle invalid session", () => {
      return request(app.getHttpServer())
        .delete("/agent/memory/session/nonexistent")
        .expect(200); // Should succeed even if session doesn't exist
    });
  });
});
