# Genie Chat - AI Agent Interface

> [!IMPORTANT]
> **Master Documentation**: For comprehensive architecture and backend details, please refer to [GENIE_MASTER_DOCUMENTATION.md](../../documentation/GENIE_MASTER_DOCUMENTATION.md).

This is a Next.js application that provides a sleek, responsive, and powerful chat interface to interact with the **Genie** backend.

## Agentica AI Features (Simulated)

This application is designed to demonstrate and allow interaction with the core concepts of a powerful agentic framework.

- **Designed for Agentic Applications**: A platform built from the ground up for creating, deploying, and managing sophisticated AI agents.
- **Context Injection**: Powerful and flexible mechanisms for injecting relevant, real-time context into agent reasoning.
- **AGUI Protocol**: A specialized "Agentic GUI" protocol for rich, real-time, bi-directional communication between agents and user interfaces.
- **MCP Support**: Support for a Multi-Agent Control Plane, enabling complex collaboration and orchestration between multiple specialized agents.
- **UI Integration & Headless Mode**: Run agents with a rich, interactive UI or in a completely headless mode for backend automation.
- **LLM & Agent Framework Agnostic**: The freedom to use any Large Language Model or agent framework, preventing vendor lock-in.
- **Full Flexibility**: Complete control over hosting (Cloud or OSS), architecture, and data.
- **Real-Time Interaction**: The UI is designed for streaming, low-latency interactions, crucial for agentic workflows.
- **Unified DevX**: A consistent and powerful developer experience for building, debugging, and deploying agents.
- **Production-Ready**: Built with observability, scalability, and security in mind.
- **Composable Architecture**: Design complex agents by composing smaller, reusable components and tools.
- **Observability & Debugging**: Advanced tools for tracing agent behavior, visualizing context, and debugging reasoning steps.

---

## How It Works

The application is built on a modern tech stack including Next.js, React, TypeScript, Tailwind CSS for styling, and Genkit for the AI backend.

### Project Structure

- **`src/app/page.tsx`**: The main entry point of the application, which renders the `GenieUI` (now simulating Agentica).
- **`src/components/genie-ui.tsx`**: The core component that orchestrates the entire user interface, including sidebars, the chat area, and the footer.
- **`src/app/actions.ts`**: Next.js Server Actions that bridge the frontend UI and the backend Genkit AI flows.
- **`src/ai/genkit.ts`**: Configures and initializes the core Genkit `ai` object.
- **`src/ai/flows/`**: Contains all the backend AI logic, defined as Genkit Flows.
  - **`generate-initial-content.ts`**: The primary flow that embodies the "Agentica AI" persona and answers questions about its features.
  - **`refine-generated-content.ts`**: Powers the content refinement tools.
  - **`summarize-text-prompt.ts`**: Automatically creates summaries for conversation history.

---

## How to Use the Application

### 1. Chatting with Agentica AI

- **Start a Conversation**: Type a question about agentic applications (e.g., "Explain the AGUI Protocol") in the text area and hit `Enter`.
- **Use Example Prompts**: Click on one of the developer-focused example prompts to start a conversation.
- **Switch Between Chats**: The left sidebar lists all your past conversations. Click on any of them to view its history.

### 2. Configuring the Agent

- The footer contains dropdowns to simulate selecting different **Agents**, **Models**, and **Tools**. While these are UI placeholders, they demonstrate how a developer could configure the agent's behavior for different tasks.

### 3. Refining Content

- Every response from the AI comes with a set of refinement tools: `Correct`, `Summarize`, and `Translate`.
