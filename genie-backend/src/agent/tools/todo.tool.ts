import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolCategory } from '../../shared/tool.constants';
import { Logger } from '@nestjs/common';

/**
 * Todo Management Tool
 * Manages a simple todo list
 */

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
}

// In-memory todo store (per session)
const todoStore = new Map<string, Todo[]>();

export const createTodoTool = (): DynamicStructuredTool => {
  const logger = new Logger('TodoTool');

  return new DynamicStructuredTool({
    name: 'todo',
    description: 'Manages a todo list. Can create, list, complete, and delete todos.',
    schema: z.object({
      operation: z.enum(['create', 'list', 'complete', 'delete', 'clear']).describe('The todo operation to perform'),
      sessionId: z.string().describe('Session ID for storing todos'),
      title: z.string().optional().describe('Todo title (required for create)'),
      description: z.string().optional().describe('Todo description (optional for create)'),
      todoId: z.string().optional().describe('Todo ID (required for complete and delete)'),
    }),
    func: async ({ operation, sessionId, title, description, todoId }: {
      operation: 'create' | 'list' | 'complete' | 'delete' | 'clear';
      sessionId: string;
      title?: string;
      description?: string;
      todoId?: string;
    }): Promise<string> => {
      try {
        // Initialize todo list for session if not exists
        if (!todoStore.has(sessionId)) {
          todoStore.set(sessionId, []);
        }

        const todos = todoStore.get(sessionId)!;

        switch (operation) {
          case 'create': {
            if (!title) return 'Error: title is required for create operation';
            const newTodo: Todo = {
              id: `todo-${Date.now()}`,
              title,
              description,
              completed: false,
              createdAt: new Date(),
            };
            todos.push(newTodo);
            logger.log(`Created todo: ${newTodo.id}`);
            return `Created todo: "${title}" (ID: ${newTodo.id})`;
          }

          case 'list': {
            if (todos.length === 0) {
              return 'No todos found.';
            }
            const todoList = todos.map((t, i) =>
              `${i + 1}. [${t.completed ? '✓' : ' '}] ${t.title} (ID: ${t.id})${t.description ? `\n   ${t.description}` : ''}`
            ).join('\n');
            return `Todos:\n${todoList}`;
          }

          case 'complete': {
            if (!todoId) return 'Error: todoId is required for complete operation';
            const todo = todos.find(t => t.id === todoId);
            if (!todo) return `Todo ${todoId} not found`;
            todo.completed = true;
            logger.log(`Completed todo: ${todoId}`);
            return `Marked "${todo.title}" as completed`;
          }

          case 'delete': {
            if (!todoId) return 'Error: todoId is required for delete operation';
            const index = todos.findIndex(t => t.id === todoId);
            if (index === -1) return `Todo ${todoId} not found`;
            const deleted = todos.splice(index, 1)[0];
            logger.log(`Deleted todo: ${todoId}`);
            return `Deleted todo: "${deleted.title}"`;
          }

          case 'clear': {
            const count = todos.length;
            todoStore.set(sessionId, []);
            logger.log(`Cleared ${count} todos for session ${sessionId}`);
            return `Cleared ${count} todos`;
          }

          default:
            return 'Error: Unknown operation';
        }
      } catch (error: any) {
        logger.error(`Todo operation error: ${error.message}`);
        return `Error performing todo operation: ${error.message}`;
      }
    },
  });
};

export const TODO_TOOL_METADATA = {
  name: 'todo',
  category: ToolCategory.TODO,
  enabled: true,
};
