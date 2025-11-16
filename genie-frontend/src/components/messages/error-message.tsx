'use client';

import type { Error } from '@/lib/types';

type ErrorMessageProps = {
  message: Error;
};

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-1 flex-col gap-1 items-start">
        <p className="text-text-light text-xs font-medium">Error</p>
        <div className="flex flex-col gap-2 rounded-lg bg-error/10 p-4 w-full shadow-sm border border-error/20 max-w-sm">
          <p className="text-sm text-error">{message.content}</p>
        </div>
      </div>
    </div>
  );
};
