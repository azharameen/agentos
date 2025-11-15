# 🚀 Quick Start Guide - Genie Backend

Get started with the advanced agentic AI backend in 5 minutes!

---

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Azure OpenAI account with API credentials
- ✅ Basic understanding of REST APIs

---

## 1. Setup Environment

Create a `.env` file in the project root:

\`\`\`env
AZURE_OPENAI_ENDPOINT=<https://your-instance.openai.azure.com/>
AZURE_OPENAI_API_KEY=your-api-key-here
PORT=3001
\`\`\`

---

## 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

---

## 3. Build and Run

\`\`\`bash

# Development mode (with hot reload)

npm run start:dev

# Production build

npm run build
npm run start:prod
\`\`\`

Server will start at: **<http://localhost:3001>**

---

## 4. Access Swagger Documentation

Open your browser and navigate to:

**<http://localhost:3001/api>**

You'll see the complete API documentation with all endpoints, request/response schemas, and examples.

---

## 5. Test Your First Agent Request

### Example 1: Simple Calculation

\`\`\`bash
curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Calculate 25 * 4",
    "enabledToolCategories": ["math"]
  }'
\`\`\`

Expected response:
\`\`\`json
{
  "output": "The result of 25 * 4 is 100.",
  "model": "gpt-4",
  "sessionId": "session-xxxxx",
  "toolsUsed": ["calculator"]
}
\`\`\`

### Example 2: Multi-Step Task

\`\`\`bash
curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Calculate 100 divided by 5, then tell me what time it is",
    "enabledToolCategories": ["math", "datetime"],
    "maxIterations": 10
  }'
\`\`\`

The agent will:

1. Use the calculator tool to compute 100 / 5 = 20
2. Use the current_time tool to get the current time
3. Return a combined response

### Example 3: RAG Query

\`\`\`bash

# First, add some knowledge

curl -X POST <http://localhost:3001/agent/rag/documents> \\
  -H "Content-Type: application/json" \\
  -d '{
    "documents": [
      "LangChain is a framework for developing applications powered by language models.",
      "It provides abstractions for working with LLMs, embeddings, and vector stores."
    ]
  }'

# Then query with context

curl -X POST <http://localhost:3001/agent/rag/query> \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is LangChain?",
    "topK": 2
  }'
\`\`\`

The system will:

1. Retrieve the 2 most relevant documents
2. Inject them as context
3. Generate a response based on the knowledge base

---

## 6. Explore Available Features

### Available Tools

| Tool | Category | What it does |
|------|----------|-------------|
| calculator | math | Mathematical operations |
| current_time | datetime | Get current date/time |
| date_calculator | datetime | Add/subtract days |
| string_manipulation | string | String operations |
| todo | todo | Task management |
| filesystem | filesystem | File operations |
| git | git | Git operations |
| web_search | web | Web search (placeholder) |

### Agent Modes

- **Standard Mode** (`simpleMode: false`) - Full agentic behavior with autonomous tool use
- **Simple Mode** (`simpleMode: true`) - Direct LLM call without agent reasoning
- **Graph Mode** (`useGraph: true`) - Use LangGraph for complex workflows
- **RAG Mode** (`enableRAG: true`) - Enable context retrieval from knowledge base

---

## 7. Common Use Cases

### Use Case 1: Todo Management

\`\`\`bash
curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Create a todo: Review pull requests, then list all my todos",
    "sessionId": "my-session",
    "specificTools": ["todo"]
  }'
\`\`\`

### Use Case 2: Date Calculations

\`\`\`bash
curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "What day will it be 30 days from now?",
    "enabledToolCategories": ["datetime"]
  }'
\`\`\`

### Use Case 3: String Processing

\`\`\`bash
curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Reverse the string hello world and make it uppercase",
    "enabledToolCategories": ["string"]
  }'
\`\`\`

---

## 8. Check System Status

### Get Available Models

\`\`\`bash
curl <http://localhost:3001/agent/models>
\`\`\`

### Get Tool Categories

\`\`\`bash
curl <http://localhost:3001/agent/tools/categories>
\`\`\`

### Get RAG Statistics

\`\`\`bash
curl <http://localhost:3001/agent/rag/stats>
\`\`\`

### Get Session Stats

\`\`\`bash
curl <http://localhost:3001/agent/session/my-session/stats>
\`\`\`

---

## 9. Advanced Features

### Use LangGraph Workflow

\`\`\`bash
curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Calculate 50 * 2 and then create a todo with the result",
    "useGraph": true,
    "enabledToolCategories": ["math", "todo"]
  }'
\`\`\`

### Conversational Sessions

\`\`\`bash

# First message

curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "My name is John",
    "sessionId": "conversation-1"
  }'

# Second message (remembers context)

curl -X POST <http://localhost:3001/agent/execute> \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "What is my name?",
    "sessionId": "conversation-1"
  }'
\`\`\`

---

## 10. Troubleshooting

### Build Errors

\`\`\`bash

# Clean install

rm -rf node_modules package-lock.json
npm install
npm run build
\`\`\`

### Azure OpenAI Connection Issues

1. Verify your `.env` file has correct credentials
2. Check Azure OpenAI endpoint format: `https://xxx.openai.azure.com/`
3. Ensure API key has proper permissions
4. Verify model deployments exist in Azure

### Port Already in Use

\`\`\`bash

# Change port in .env

PORT=3001
\`\`\`

Or kill the process using port 3001:
\`\`\`bash

# Windows

netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac

lsof -i :3001
kill -9 <PID>
\`\`\`

---

## 11. Next Steps

- ✅ **Read ARCHITECTURE.md** for detailed system documentation
- ✅ **Read IMPLEMENTATION_SUMMARY.md** for complete feature list
- ✅ **Explore Swagger UI** at <http://localhost:3001/api>
- ✅ **Create custom tools** in `src/agent/tools/`
- ✅ **Add more documents** to the RAG knowledge base
- ✅ **Experiment with different models** and parameters

---

## 12. Support & Resources

- **Documentation**: See ARCHITECTURE.md
- **Examples**: See IMPLEMENTATION_SUMMARY.md
- **API Reference**: <http://localhost:3001/api> (Swagger)
- **LangChain Docs**: <https://js.langchain.com/>
- **LangGraph Docs**: <https://langchain-ai.github.io/langgraphjs/>

---

## 🎉 You're Ready

Start building amazing agentic AI applications! The backend is fully functional with:

- ✅ Autonomous agents with tool calling
- ✅ Graph-based workflows
- ✅ RAG for context-aware responses
- ✅ Multiple tools ready to use
- ✅ Session management and memory
- ✅ Full API documentation

**Happy coding! 🚀**
