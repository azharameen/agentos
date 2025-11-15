# Genie Backend & API — Master Documentation (Vertical Slices)

---

## Table of Contents

- Architecture Overview
- Agentic Execution (LangChain/Graph)
- Streaming & Event Protocol
- RAG (Retrieval-Augmented Generation)
- Memory Management
- Multi-Agent Orchestration
- Workflow Versioning
- API Unification & Reference
- Error Handling & Validation
- Testing & Quality
- Deployment & Environment
- Feature Status Table
- Migration Guide

---

## Architecture Overview

- Modular NestJS backend with vertical slicing: agentic execution, RAG, memory, multi-agent, workflow versioning, streaming/events, error handling, and API unification.
- All features are implemented as injectable services, DTOs, and controllers.
- Persistent state via SQLite (vectorstore, memory, checkpoints).
- Extensible tool system, safe tool wrappers, and advanced observability.

---

## Agentic Execution (LangChain/Graph)

- Autonomous agent execution with tool orchestration, session management, and error handling.
- Supports both LangChain (ReAct) and LangGraph (graph-based workflows).
- API: `POST /agent/execute` (sync/stream), `useGraph` flag for workflow mode.
- Fully implemented and documented.

---

## Streaming & Event Protocol

- Real-time SSE streaming with CopilotKit event protocol.
- Event types: RUN_STARTED, TEXT_MESSAGE_CONTENT, TOOL_CALL_START, TOOL_COMPLETE, RUN_FINISHED, RUN_ERROR, RUN_CANCELLED, etc.
- Frontend integration and robust error handling.
- Fully implemented and documented.

---

## RAG (Retrieval-Augmented Generation)

- RAG endpoints for document storage, semantic search, context injection, statistics, provenance, and HNSW optimization.
- API: `/agent/rag/*` endpoints.
- Fully implemented and documented.

---

## Memory Management

- Three-layer memory: session (in-memory), persistent (SQLite), workflow checkpoints.
- Analytics, export/import, pruning, summaries.
- API: `/agent/memory/*` endpoints.
- Fully implemented and documented.

---

## Multi-Agent Orchestration

- Multi-agent coordinator with 4 modes: sequential, parallel, debate, router.
- DTOs, API, Swagger docs, and integration with agent orchestrator.
- API: `POST /agent/multi-execute` (deprecated), unified under `/agent/execute` with `multiAgent` flag.
- Fully implemented and documented.

---

## Workflow Versioning

- Workflow configuration versioning, snapshots, comparison, pruning, CRUD API.
- API: `/agent/workflows/*` endpoints.
- Fully implemented and documented.

---

## API Unification & Reference

- Unified `/agent/execute` endpoint for all agentic features (sync, stream, multi-agent, RAG, workflow).
- DTOs, controller refactor, Swagger docs, migration guide.
- All legacy endpoints deprecated with clear migration path.
- Fully implemented and documented.

---

## Error Handling & Validation

- Global exception filter, validation pipe, DTO validation, error format, rate limiting, CORS.
- Consistent error responses and best practices.
- Fully implemented and documented.

---

## Testing & Quality

- Unit tests, E2E tests, streaming tests, coverage, troubleshooting.
- Testing strategies and success criteria documented.
- Fully implemented and documented.

---

## Deployment & Environment

- Docker deployment, environment variable configuration, scaling recommendations, privacy/compliance.
- All settings documented in `.env.template` and README.md.
- Fully implemented and documented.

---

## Feature Status Table

| Vertical Slice            | Status         | Docs in Sync | Gaps/Notes                |
|---------------------------|---------------|--------------|---------------------------|
| Agentic Execution         | Full          | Yes          | -                         |
| Streaming & Events        | Full          | Yes          | -                         |
| RAG                       | Full          | Yes          | -                         |
| Memory Management         | Full          | Yes          | -                         |
| Multi-Agent Orchestration | Full          | Yes          | -                         |
| Workflow Versioning       | Full          | Yes          | -                         |
| API Unification           | Full          | Yes          | -                         |
| Error Handling/Validation | Full          | Yes          | -                         |
| Testing & Quality         | Full          | Yes          | -                         |
| Architecture/Best Practices| Full         | Yes          | -                         |

---

## Migration Guide

- All legacy endpoints (`/agent/query`, `/agent/stream`, `/agent/multi-execute`) are deprecated.
- Use `/agent/execute` with appropriate flags (`stream`, `multiAgent`, `useGraph`, etc.) for all agentic tasks.
- See API_UNIFICATION_SUMMARY.md and MIGRATION_GUIDE.md for migration steps and examples.

---

## References

- See documentation/ for SSE_EVENTS.md, STREAMING_IMPLEMENTATION.md, TESTING_STREAMING.md, API_CONTRACT.md, BACKEND_IMPROVEMENTS.md, INTEGRATION_SUMMARY.md.
- See genie-backend/ for README.md, ARCHITECTURE.md, IMPLEMENTATION_SUMMARY.md, ADVANCED_FEATURES.md, API_REFERENCE.md, API_REFERENCE_DETAILED.md, API_UNIFICATION_SUMMARY.md, QUICKSTART.md, LANGCHAIN_V1_MIGRATION.md.

---

**Status: All features fully implemented and documented. Vertical slicing architecture is complete.**
