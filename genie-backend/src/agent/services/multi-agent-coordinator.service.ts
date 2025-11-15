import { Injectable, Logger } from "@nestjs/common";
import { AgentOrchestratorService } from "./agent-orchestrator.service";
import { AgentExecutionOptions } from "../../shared/agent.interface";

/**
 * Multi-agent coordination modes
 */
export enum CoordinationMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  DEBATE = "debate",
  ROUTER = "router",
}

/**
 * Agent role definition
 */
export interface AgentRole {
  id: string;
  name: string;
  description: string;
  toolCategories?: string[];
  specificTools?: string[];
  systemPrompt?: string;
}

/**
 * Multi-agent task configuration
 */
export interface MultiAgentTask {
  prompt: string;
  agents: AgentRole[];
  mode: CoordinationMode;
  sessionId?: string;
  model?: string;
  temperature?: number;
  maxRounds?: number;
}

/**
 * Multi-agent execution result
 */
export interface MultiAgentResult {
  output: string;
  agentResults: Array<{
    agentId: string;
    agentName: string;
    output: string;
    toolsUsed: string[];
    durationMs: number;
  }>;
  mode: CoordinationMode;
  totalDurationMs: number;
  sessionId?: string;
}

/**
 * MultiAgentCoordinatorService
 * Coordinates multiple AI agents with different roles and collaboration patterns.
 *
 * Responsibilities:
 * - Sequential execution (pipeline)
 * - Parallel execution (concurrent analysis)
 * - Debate/consensus (collaborative reasoning)
 * - Router (intelligent task delegation)
 *
 * Usage:
 * Injected via NestJS DI. Use execute for multi-agent tasks, specifying mode and agent roles.
 */
@Injectable()
export class MultiAgentCoordinatorService {
  private readonly logger = new Logger(MultiAgentCoordinatorService.name);

  constructor(private readonly orchestrator: AgentOrchestratorService) { }

  /**
   * Executes a multi-agent task with specified coordination mode.
   * @param task MultiAgentTask configuration
   * @returns MultiAgentResult object
   */
  async execute(task: MultiAgentTask): Promise<MultiAgentResult> {
    const startTime = Date.now();
    this.logger.log(
      `Multi-agent execution started: mode=${task.mode}, agents=${task.agents.length}`,
    );

    let result: MultiAgentResult;

    switch (task.mode) {
      case CoordinationMode.SEQUENTIAL:
        result = await this.executeSequential(task);
        break;
      case CoordinationMode.PARALLEL:
        result = await this.executeParallel(task);
        break;
      case CoordinationMode.DEBATE:
        result = await this.executeDebate(task);
        break;
      case CoordinationMode.ROUTER:
        result = await this.executeRouter(task);
        break;
      default:
        throw new Error(`Unknown coordination mode: ${task.mode}`);
    }

    result.totalDurationMs = Date.now() - startTime;
    this.logger.log(
      `Multi-agent execution completed in ${result.totalDurationMs}ms`,
    );

    return result;
  }

  /**
   * Executes agents sequentially (pipeline mode).
   * @param task MultiAgentTask configuration
   * @returns MultiAgentResult object
   */
  private async executeSequential(
    task: MultiAgentTask,
  ): Promise<MultiAgentResult> {
    const agentResults: MultiAgentResult["agentResults"] = [];
    let currentPrompt = task.prompt;

    for (const agent of task.agents) {
      const startTime = Date.now();
      this.logger.log(`Sequential: executing agent ${agent.name}`);

      const options: AgentExecutionOptions = {
        model: task.model,
        temperature: task.temperature,
        enabledToolCategories: agent.toolCategories,
        specificTools: agent.specificTools,
      };

      const execResult = await this.orchestrator.executeTask(
        currentPrompt,
        task.sessionId || `sequential-${agent.id}`,
        options,
      );

      agentResults.push({
        agentId: agent.id,
        agentName: agent.name,
        output: execResult.output,
        toolsUsed: execResult.toolsUsed || [],
        durationMs: Date.now() - startTime,
      });

      currentPrompt = `Previous agent (${agent.name}) said: "${execResult.output}"\n\nNow continue with: ${task.prompt}`;
    }

    return {
      output: agentResults[agentResults.length - 1].output,
      agentResults,
      mode: CoordinationMode.SEQUENTIAL,
      totalDurationMs: 0,
      sessionId: task.sessionId,
    };
  }

  /**
   * Executes agents in parallel (concurrent analysis mode).
   * @param task MultiAgentTask configuration
   * @returns MultiAgentResult object
   */
  private async executeParallel(
    task: MultiAgentTask,
  ): Promise<MultiAgentResult> {
    this.logger.log(`Parallel: executing ${task.agents.length} agents`);

    const promises = task.agents.map(async (agent) => {
      const startTime = Date.now();
      this.logger.log(`Parallel: executing agent ${agent.name}`);

      const options: AgentExecutionOptions = {
        model: task.model,
        temperature: task.temperature,
        enabledToolCategories: agent.toolCategories,
        specificTools: agent.specificTools,
      };

      const execResult = await this.orchestrator.executeTask(
        task.prompt,
        `${task.sessionId || "parallel"}-${agent.id}`,
        options,
      );

      return {
        agentId: agent.id,
        agentName: agent.name,
        output: execResult.output,
        toolsUsed: execResult.toolsUsed || [],
        durationMs: Date.now() - startTime,
      };
    });

    const agentResults = await Promise.all(promises);

    const synthesisPrompt = `
You are a synthesis agent. Multiple expert agents have analyzed the following task:

**Original Task**: ${task.prompt}

**Agent Results**:
${agentResults.map((r) => `- ${r.agentName}: ${r.output}`).join("\n")}

Synthesize these results into a coherent, comprehensive answer.
`;

    const finalResult = await this.orchestrator.executeTask(
      synthesisPrompt,
      task.sessionId || "parallel-synthesis",
      {
        model: task.model,
        temperature: task.temperature,
      },
    );

    return {
      output: finalResult.output,
      agentResults,
      mode: CoordinationMode.PARALLEL,
      totalDurationMs: 0,
      sessionId: task.sessionId,
    };
  }

  /**
   * Executes agents in debate/consensus mode (collaborative reasoning).
   * @param task MultiAgentTask configuration
   * @returns MultiAgentResult object
   */
  private async executeDebate(task: MultiAgentTask): Promise<MultiAgentResult> {
    const maxRounds = task.maxRounds || 3;
    const agentResults: MultiAgentResult["agentResults"] = [];
    const debateHistory: string[] = [];

    this.logger.log(
      `Debate: ${task.agents.length} agents, max ${maxRounds} rounds`,
    );

    for (let round = 1; round <= maxRounds; round++) {
      this.logger.log(`Debate round ${round}/${maxRounds}`);

      for (const agent of task.agents) {
        const startTime = Date.now();

        const debatePrompt = `
**Your Role**: ${agent.name} - ${agent.description}

**Original Task**: ${task.prompt}

**Previous Debate**:
${debateHistory.length > 0 ? debateHistory.join("\n\n") : "This is the first round."}

Provide your analysis or counter-argument. Be constructive and cite evidence.
`;

        const options: AgentExecutionOptions = {
          model: task.model,
          temperature: task.temperature,
          enabledToolCategories: agent.toolCategories,
          specificTools: agent.specificTools,
        };

        const execResult = await this.orchestrator.executeTask(
          debatePrompt,
          `${task.sessionId || "debate"}-${agent.id}`,
          options,
        );

        const contribution = `**${agent.name}** (Round ${round}): ${execResult.output}`;
        debateHistory.push(contribution);

        agentResults.push({
          agentId: agent.id,
          agentName: `${agent.name} (Round ${round})`,
          output: execResult.output,
          toolsUsed: execResult.toolsUsed || [],
          durationMs: Date.now() - startTime,
        });
      }
    }

    const consensusPrompt = `
**Original Task**: ${task.prompt}

**Debate Summary**:
${debateHistory.join("\n\n")}

As a neutral moderator, synthesize the debate into a final consensus answer.
`;

    const finalResult = await this.orchestrator.executeTask(
      consensusPrompt,
      task.sessionId || "debate-consensus",
      {
        model: task.model,
        temperature: 0.3,
      },
    );

    return {
      output: finalResult.output,
      agentResults,
      mode: CoordinationMode.DEBATE,
      totalDurationMs: 0,
      sessionId: task.sessionId,
    };
  }

  /**
   * Executes agents in router mode (intelligent task delegation).
   * @param task MultiAgentTask configuration
   * @returns MultiAgentResult object
   */
  private async executeRouter(task: MultiAgentTask): Promise<MultiAgentResult> {
    this.logger.log(`Router: selecting best agent from ${task.agents.length}`);

    const routerPrompt = `
You are a task router. Given a task, select the most appropriate agent.

**Task**: ${task.prompt}

**Available Agents**:
${task.agents.map((a, i) => `${i + 1}. ${a.name}: ${a.description}`).join("\n")}

Respond with ONLY the number (1-${task.agents.length}) of the best agent for this task.
`;

    const routerResult = await this.orchestrator.executeTask(
      routerPrompt,
      task.sessionId || "router",
      {
        model: task.model,
        temperature: 0.1,
      },
    );

    const selectedIndex = parseInt(routerResult.output.trim(), 10) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= task.agents.length
    ) {
      this.logger.warn(`Invalid router selection, defaulting to first agent`);
      const agent = task.agents[0];
      const startTime = Date.now();

      const execResult = await this.orchestrator.executeTask(
        task.prompt,
        task.sessionId || `router-${agent.id}`,
        {
          model: task.model,
          temperature: task.temperature,
          enabledToolCategories: agent.toolCategories,
          specificTools: agent.specificTools,
        },
      );

      return {
        output: execResult.output,
        agentResults: [
          {
            agentId: agent.id,
            agentName: agent.name,
            output: execResult.output,
            toolsUsed: execResult.toolsUsed || [],
            durationMs: Date.now() - startTime,
          },
        ],
        mode: CoordinationMode.ROUTER,
        totalDurationMs: 0,
        sessionId: task.sessionId,
      };
    }

    const selectedAgent = task.agents[selectedIndex];
    this.logger.log(`Router: selected ${selectedAgent.name}`);

    const startTime = Date.now();
    const execResult = await this.orchestrator.executeTask(
      task.prompt,
      task.sessionId || `router-${selectedAgent.id}`,
      {
        model: task.model,
        temperature: task.temperature,
        enabledToolCategories: selectedAgent.toolCategories,
        specificTools: selectedAgent.specificTools,
      },
    );

    return {
      output: execResult.output,
      agentResults: [
        {
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          output: execResult.output,
          toolsUsed: execResult.toolsUsed || [],
          durationMs: Date.now() - startTime,
        },
      ],
      mode: CoordinationMode.ROUTER,
      totalDurationMs: 0,
      sessionId: task.sessionId,
    };
  }
}
