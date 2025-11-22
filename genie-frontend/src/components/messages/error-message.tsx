"use client";

import React from "react";
import type { ErrorMessage as ErrorMessageType } from "@/lib/types";

type ErrorMessageProps = {
	message: ErrorMessageType;
};

/**
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const ErrorMessage = React.memo<ErrorMessageProps>(
	({ message }) => {
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
	},
	(prevProps, nextProps) => {
		return (
			prevProps.message.id === nextProps.message.id &&
			prevProps.message.content === nextProps.message.content
		);
	}
);
