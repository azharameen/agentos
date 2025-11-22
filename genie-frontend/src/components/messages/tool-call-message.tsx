"use client";

import React from "react";
import type { ToolCallMessage as ToolCallMessageType } from "@/lib/types";
import { Terminal } from "lucide-react";

type ToolCallMessageProps = {
	message: ToolCallMessageType;
};

/**
 * PERFORMANCE: Memoized to prevent re-renders when message hasn't changed
 */
export const ToolCallMessage = React.memo<ToolCallMessageProps>(
	({ message }) => {
		return (
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0 size-8 bg-gray-300 rounded-full text-gray-600 flex items-center justify-center">
					<Terminal size={20} />
				</div>
				<div className="flex flex-1 flex-col gap-1 items-start">
					<p className="text-text-light text-xs font-medium">Tool Call</p>
					<div className="flex flex-col gap-2 rounded-lg bg-background-light p-4 w-full shadow-sm border border-border-light max-w-sm">
						<p className="font-medium text-text-main">{message.toolName}</p>
						<p className="text-xs text-text-light">Status: {message.status}</p>
						{message.result && (
							<pre className="text-xs text-text-light bg-background-dark p-2 rounded-lg">
								{message.result}
							</pre>
						)}
					</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// PERFORMANCE: Re-render if status or result changes
		return (
			prevProps.message.id === nextProps.message.id &&
			prevProps.message.status === nextProps.message.status &&
			prevProps.message.result === nextProps.message.result
		);
	}
);
