<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

**Genie Backend** - A production-grade AI agent backend built with NestJS, LangChain, LangGraph, and Azure OpenAI. Features autonomous agents, RAG (Retrieval-Augmented Generation), persistent memory, and advanced observability.

> [!IMPORTANT]
> **Master Documentation**: For comprehensive architecture, API details, and feature guides, please refer to [GENIE_MASTER_DOCUMENTATION.md](../documentation/GENIE_MASTER_DOCUMENTATION.md).

### 🚀 Key Features

- 🤖 **Autonomous Agents** - ReAct-style reasoning with tool calling
- 🔀 **LangGraph Workflows** - Graph-based workflows with persistent checkpoints
- 📚 **RAG System** - SQLite-backed vector embeddings with provenance tracking
- 🛠️ **Safe Tool Execution** - Timeout protection, retry logic, sandbox validation
- 💾 **Advanced Memory** - Export/import, analytics, pruning strategies
- 🛡️ **Content Safety** - Azure AI Content Safety integration (optional)
- 📊 **Token Tracking** - Real-time usage monitoring and cost calculation
- 📈 **Local-Only Observability** - Pino logging, distributed tracing (privacy-first)
- 🔧 **Multi-Model Support** - Azure OpenAI (GPT-4, GPT-3.5, embeddings)
- 🌊 **Enhanced Streaming** - Real-time tool progress events with SSE
- 👥 **Multi-Agent Orchestration** - Collaborate agents in sequential, parallel, debate, or router modes
- 📦 **Workflow Versioning** - Version control for agent configurations with rollback
- ✅ **Production-Ready** - Comprehensive tests, health checks, Swagger API docs

**📖 Full Documentation**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for comprehensive system design.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Azure OpenAI** account with API key and deployed models:
  - Chat model (e.g., gpt-4, gpt-35-turbo)
  - Embedding model (e.g., text-embedding-3-small-2-agentos)
- **(Optional)** LangSmith account for observability

### Installation

```bash
# Clone repository
cd genie-backend

# Install dependencies
npm install

# Copy environment template
cp .env.template .env

# Edit .env with your Azure OpenAI credentials
# Required: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, deployment names
```

### Configuration

Edit `.env` with your settings:

```bash
# Azure OpenAI (REQUIRED)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small-2-agentos

# Azure Content Safety (OPTIONAL - Recommended for production)
CONTENT_SAFETY_ENABLED=false
AZURE_CONTENT_SAFETY_ENDPOINT=https://your-content-safety.cognitiveservices.azure.com/
AZURE_CONTENT_SAFETY_API_KEY=your-key-here
CONTENT_SAFETY_HATE_THRESHOLD=4
CONTENT_SAFETY_VIOLENCE_THRESHOLD=4
CONTENT_SAFETY_SEXUAL_THRESHOLD=4
CONTENT_SAFETY_SELFHARM_THRESHOLD=4

# Persistence (OPTIONAL - Defaults provided)
USE_SQLITE_VECTORSTORE=true
DB_DIR=./data
```

**Privacy Guarantee**: All data stays local except Azure OpenAI/Content Safety (your tenant only). Zero external telemetry.

**See `.env.template` for all 90+ configuration options.**

### Build & Run

```bash
# Development mode (hot reload)
npm run start:dev

# Production build
npm run build

# Production mode
npm run start:prod
```

**API Docs**: <http://localhost:3001/api> (Swagger UI)

---

## 🔧 Usage Examples

### Execute Agentic Task

```bash
curl -X POST http://localhost:3001/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Calculate 25 * 4 and tell me the date 10 days from now",
    "sessionId": "session-123",
    "model": "gpt-4"
  }'
```

### Add RAG Documents

```bash
curl -X POST http://localhost:3001/agent/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      "LangChain is a framework for building LLM applications.",
      "LangGraph enables stateful, multi-actor workflows."
    ]
  }'
```

### Query with RAG Context

```bash
curl -X POST http://localhost:3001/agent/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is LangChain?",
    "sessionId": "session-123"
  }'
```

### Memory Management

```bash
# Get memory analytics
curl http://localhost:3001/agent/memory/analytics

# Export memory backup
curl http://localhost:3001/agent/memory/export > backup.json

# Import memory backup
curl -X POST http://localhost:3001/agent/memory/import \
  -H "Content-Type: application/json" \
  -d @backup.json

# Prune old sessions
curl -X POST http://localhost:3001/agent/memory/prune \
  -H "Content-Type: application/json" \
  -d '{"maxSessions": 100, "keepRecentDays": 30}'
```

### Content Safety

```bash
# Check content safety status
curl http://localhost:3001/agent/content-safety/status

# Analyze text for safety violations
curl -X POST http://localhost:3001/agent/content-safety/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Your content here"}'
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────┐
│      API Layer (REST/GraphQL)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     AgentOrchestratorService        │
└─┬────────┬────────┬─────────┬───────┘
  │        │        │         │
  ▼        ▼        ▼         ▼
┌───────┐ ┌─────┐ ┌─────┐ ┌────────┐
│LangCh │ │Graph│ │ RAG │ │Memory  │
│ Agent │ │Work │ │     │ │+Persist│
└───────┘ └─────┘ └─────┘ └────────┘
     │        │       │         │
     └────────┴───────┴─────────┘
                │
     ┌──────────▼──────────┐
     │ SQLite Persistence  │
     │ • Vectorstore       │
     │ • Memory            │
     │ • Checkpoints       │
     └─────────────────────┘
```

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed component documentation.**

---

## 🧪 Testing

```bash
# unit tests (32 tests)
npm run test

# e2e tests (20+ endpoint tests)
npm run test:e2e

# test coverage
npm run test:cov
```

**Test Coverage**: 100% of critical services (AgentMemoryService, ContentSafetyService) with comprehensive E2E tests for all API endpoints.

---

## 🚀 Deployment

### Docker Deployment (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
```

Build and run:

```bash
docker build -t genie-backend .
docker run -p 3001:3001 --env-file .env genie-backend
```

### Environment Variables for Production

**Critical settings:**

- `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI resource endpoint
- `AZURE_OPENAI_API_KEY` - API key (use Azure Key Vault in production)
- `CONTENT_SAFETY_ENABLED=true` - Enable content moderation (recommended)
- `USE_SQLITE_VECTORSTORE=true` - Use persistent vectorstore
- `NODE_ENV=production`

**Privacy & Compliance:**

- All data stays local (SQLite databases in `./data/`)
- No external telemetry or cloud tracing (LangSmith removed)
- Content safety sends data to YOUR Azure tenant only
- GDPR/HIPAA/SOC2 ready (see `PRIVACY_REPORT.md`)

**Database Persistence:**

- Mount `./data` volume for SQLite databases
- Backup `data/` directory regularly
- Consider migrating to PostgreSQL + pgvector for scale

### Scaling Recommendations

- **Horizontal Scaling**: Stateless design supports multiple instances
- **Database**: Migrate to PostgreSQL with pgvector for production
- **Queue System**: Add Bull/BullMQ for async processing
- **Load Balancer**: Use Nginx or cloud ALB

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed deployment instructions.**

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
