import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolCategory } from '../../shared/tool.constants';

/**
 * Current Time Tool
 * Returns the current date and time
 */
export const createCurrentTimeTool = (): DynamicStructuredTool => {
  return new DynamicStructuredTool({
    name: 'current_time',
    description: 'Returns the current date and time in ISO format. Use this when you need to know what time it is now.',
    schema: z.object({
      format: z.enum(['iso', 'local', 'unix']).optional().describe('Output format: iso (default), local, or unix timestamp'),
    }),
    func: async ({ format = 'iso' }: { format?: 'iso' | 'local' | 'unix' }): Promise<string> => {
      const now = new Date();

      switch (format) {
        case 'unix':
          return `Current time (Unix timestamp): ${now.getTime()}`;
        case 'local':
          return `Current time (local): ${now.toLocaleString()}`;
        case 'iso':
        default:
          return `Current time (ISO): ${now.toISOString()}`;
      }
    },
  });
};

export const CURRENT_TIME_TOOL_METADATA = {
  name: 'current_time',
  category: ToolCategory.DATETIME,
  enabled: true,
};
