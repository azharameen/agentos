**API Docs:** Swagger at http://localhost:3001/api
# 🧑‍💻 Genie Backend — Copilot Instructions

This guide enables AI coding agents to be immediately productive in the Genie Backend codebase. It summarizes architecture, workflows, conventions, and integration points unique to this project.

---

## 🏗️ Big Picture Architecture
- **Framework:** NestJS (TypeScript), modular service/controller structure
- **Core Components:**
  - `agent/` — Autonomous agents, tool orchestration, RAG, workflows
  - `shared/` — Model, tool, and agent interfaces/constants
  - **Services:** LangChain agent, LangGraph workflow, RAG, memory, observability, tool registry, Azure OpenAI adapter
- **Data Flow:**
  - API (REST) → AgentOrchestrator → LangChain/LangGraph → Tools/RAG/Memory → Response
  - Persistent state via SQLite (vectorstore, memory, checkpoints)
- **Why:** Designed for extensible, production-grade agentic AI with safe tool use, persistent memory, and advanced observability

---

## ⚡ Developer Workflows
- **Install:** `npm install` (Node.js 18+)
- **Env Setup:** Copy `.env.template` → `.env`, set Azure OpenAI keys and model names
- **Run (dev):** `npm run start:dev` (hot reload)
- **Run (prod):** `npm run build` → `npm run start:prod`
- **Test:**
  - Unit: `npm test`
  - E2E: `npm run test:e2e`
  - Coverage: `npm run test:cov`
- **API Docs:** Swagger at [http://localhost:3001/api](http://localhost:3001/api)
- **Docker:** See `README.md` and `ARCHITECTURE.md` for Dockerfile and deployment details

---

## 🧩 Project-Specific Patterns
- **Tool Safety:** All tools use SafeToolWrapper (timeout, retries, Zod validation)
- **Service Boundaries:** Each service in `agent/services/` has a single responsibility and is injected via NestJS DI
- **Extending Tools:**
  1. Add tool in `src/agent/tools/`
  2. Export in `tools/index.ts`
  3. Register in `tool-registry.service.ts`
- **Memory:** Three-layer system (session, persistent, workflow checkpoints) — see `agent-memory.service.ts`, `memory-sqlite.service.ts`, `langgraph-persistence.service.ts`
- **RAG:** Uses SQLite vectorstore, supports HNSW for large-scale ANN search (enable via `.env`)
- **Observability:** LangSmith tracing auto-enabled if `LANGCHAIN_TRACING_V2=true` in `.env`
- **API Usage:** Most agentic tasks via `POST /agent/execute`; RAG via `/agent/rag/*` endpoints

---

## 🔗 Integration Points
- **Azure OpenAI:** Credentials and deployment names required in `.env`
- **LangChain/LangGraph:** Used for agent reasoning and workflows
- **LangSmith:** Observability/tracing (optional, recommended for prod)
- **Persistence:** SQLite databases in `/data` (vectorstore, memory, checkpoints)

---

## 📚 Key References
- `ARCHITECTURE.md` — System design, service boundaries, data flow
- `QUICKSTART.md` — Setup, usage, troubleshooting
- `README.md` — Features, build/run/test, deployment
- `src/agent/tools/` — Tool implementations and extension pattern
- `src/agent/services/` — Core service logic
- `src/shared/` — Model/tool/agent interfaces and constants

---

## 📝 Examples
- **Add a tool:** See `ARCHITECTURE.md` for template and registration steps
- **Agentic API call:** `POST /agent/execute` with `{ "prompt": "...", "enabledToolCategories": ["math"] }`
- **RAG document add/query:** `POST /agent/rag/documents`, `POST /agent/rag/query`

---

## 🚦 Conventions
- **TypeScript only**; use DTOs for API payloads
- **Service classes**: One responsibility, injected via NestJS DI
- **Tool input validation:** Always use Zod schemas
- **Environment config:** All features toggled via `.env` (see `.env.template`)

---

## 🛑 What NOT to do
- Do not bypass SafeToolWrapper for tool execution
- Do not hardcode credentials; always use `.env`
- Do not add tools/services without updating registry and documentation

---

**For unclear or missing patterns, consult `ARCHITECTURE.md` and `QUICKSTART.md`.**

---

**Happy coding! 🚀**
