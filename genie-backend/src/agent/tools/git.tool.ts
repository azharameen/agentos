import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolCategory } from '../../shared/tool.constants';
import { Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git Tool
 * Executes git commands
 */
export const createGitTool = (): DynamicStructuredTool => {
  const logger = new Logger('GitTool');

  return new DynamicStructuredTool({
    name: 'git',
    description: 'Executes git commands like status, log, diff, branch, add, commit, push, pull, etc.',
    schema: z.object({
      command: z.enum([
        'status',
        'log',
        'diff',
        'branch',
        'add',
        'commit',
        'push',
        'pull',
        'checkout',
        'show',
      ]).describe('The git command to execute'),
      args: z.string().optional().describe('Additional arguments for the git command'),
    }),
    func: async ({ command, args = '' }: { command: string; args?: string }): Promise<string> => {
      try {
        logger.log(`Executing git command: ${command} ${args}`);

        // Construct git command
        const gitCommand = `git ${command} ${args}`.trim();

        // Execute command
        const { stdout, stderr } = await execAsync(gitCommand, {
          cwd: process.cwd(),
          timeout: 10000, // 10 second timeout
        });

        if (stderr && !stderr.includes('warning')) {
          logger.warn(`Git stderr: ${stderr}`);
        }

        return `Git ${command} output:\n${stdout || 'Command executed successfully (no output)'}`;
      } catch (error: any) {
        logger.error(`Git command error: ${error.message}`);
        return `Error executing git command: ${error.message}`;
      }
    },
  });
};

export const GIT_TOOL_METADATA = {
  name: 'git',
  category: ToolCategory.GIT,
  enabled: true,
};
