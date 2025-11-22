"use client";

import React from "react";
import type { ContextMessage as ContextMessageType } from "@/lib/types";

type ContextMessageProps = {
	message: ContextMessageType;
};

/**
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const ContextMessage = React.memo<ContextMessageProps>(
	({ message }) => {
		return (
			<div className="flex items-end gap-3">
				<div className="flex flex-1 flex-col gap-1 items-start">
					<p className="text-text-light text-xs font-medium">Context</p>
					<div className="flex flex-col gap-2 rounded-lg bg-background-light p-4 w-full shadow-sm border border-border-light max-w-sm">
						<p className="text-sm text-text-main">{message.content}</p>
					</div>
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.message.id === nextProps.message.id &&
			prevProps.message.content === nextProps.message.content
		);
	}
);
