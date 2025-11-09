import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolCategory } from '../../shared/tool.constants';

/**
 * Calculator Tool
 * Performs mathematical calculations
 */
export const createCalculatorTool = (): DynamicStructuredTool => {
  return new DynamicStructuredTool({
    name: 'calculator',
    description: 'Performs mathematical calculations. Input should be a valid mathematical expression as a string (e.g., "2 + 2", "sqrt(16)", "5 * (3 + 2)").',
    schema: z.object({
      expression: z.string().describe('The mathematical expression to evaluate'),
    }),
    func: async ({ expression }: { expression: string }): Promise<string> => {
      try {
        // Use Function constructor for safe evaluation
        // Note: In production, consider using a proper math expression parser
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
        const result = Function(`"use strict"; return (${sanitized})`)();

        return `The result of ${expression} is ${result}`;
      } catch (error: any) {
        return `Error calculating expression: ${error.message}`;
      }
    },
  });
};

export const CALCULATOR_TOOL_METADATA = {
  name: 'calculator',
  category: ToolCategory.MATH,
  enabled: true,
};
