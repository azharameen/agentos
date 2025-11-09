import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolCategory } from '../../shared/tool.constants';

/**
 * Date Calculator Tool
 * Performs date calculations (add/subtract days, compare dates, etc.)
 */
export const createDateCalculatorTool = (): DynamicStructuredTool => {
  return new DynamicStructuredTool({
    name: 'date_calculator',
    description: 'Performs date calculations. Can add/subtract days from a date, calculate days between dates, or get day of week.',
    schema: z.object({
      operation: z.enum(['add_days', 'subtract_days', 'days_between', 'day_of_week']).describe('The operation to perform'),
      date: z.string().optional().describe('Starting date in ISO format (YYYY-MM-DD). Defaults to today if not provided.'),
      days: z.number().optional().describe('Number of days to add/subtract (required for add_days and subtract_days)'),
      endDate: z.string().optional().describe('End date in ISO format (required for days_between)'),
    }),
    func: async ({ operation, date, days, endDate }: {
      operation: 'add_days' | 'subtract_days' | 'days_between' | 'day_of_week';
      date?: string;
      days?: number;
      endDate?: string;
    }): Promise<string> => {
      try {
        const startDate = date ? new Date(date) : new Date();

        switch (operation) {
          case 'add_days': {
            if (days === undefined) return 'Error: days parameter is required for add_days operation';
            const result = new Date(startDate);
            result.setDate(result.getDate() + days);
            return `${days} days after ${startDate.toISOString().split('T')[0]} is ${result.toISOString().split('T')[0]}`;
          }

          case 'subtract_days': {
            if (days === undefined) return 'Error: days parameter is required for subtract_days operation';
            const result = new Date(startDate);
            result.setDate(result.getDate() - days);
            return `${days} days before ${startDate.toISOString().split('T')[0]} is ${result.toISOString().split('T')[0]}`;
          }

          case 'days_between': {
            if (!endDate) return 'Error: endDate parameter is required for days_between operation';
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return `There are ${diffDays} days between ${startDate.toISOString().split('T')[0]} and ${end.toISOString().split('T')[0]}`;
          }

          case 'day_of_week': {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `${startDate.toISOString().split('T')[0]} is a ${days[startDate.getDay()]}`;
          }

          default:
            return 'Error: Unknown operation';
        }
      } catch (error: any) {
        return `Error performing date calculation: ${error.message}`;
      }
    },
  });
};

export const DATE_CALCULATOR_TOOL_METADATA = {
  name: 'date_calculator',
  category: ToolCategory.DATETIME,
  enabled: true,
};
