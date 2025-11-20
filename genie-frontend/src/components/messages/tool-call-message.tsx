'use client';

import type { ToolCall } from '@/lib/types';
import { Terminal } from 'lucide-react';

type ToolCallMessageProps = {
  message: ToolCall;
};

export const ToolCallMessage = ({ message }: ToolCallMessageProps) => {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 size-8 bg-gray-300 rounded-full text-gray-600 flex items-center justify-center">
        <Terminal size={20} />
      </div>
      <div className="flex flex-1 flex-col gap-1 items-start">
        <p className="text-text-light text-xs font-medium">Tool Call</p>
        <div className="flex flex-col gap-2 rounded-lg bg-background-light p-4 w-full shadow-sm border border-border-light max-w-sm">
          <p className="font-medium text-text-main">{message.toolName}</p>
          <pre className="text-xs text-text-light bg-background-dark p-2 rounded-lg">
            {JSON.stringify(message.args, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
