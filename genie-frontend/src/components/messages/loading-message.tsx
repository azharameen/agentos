"use client";

import React from "react";

type LoadingMessageProps = {
	avatarUrl?: string;
};

/**
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */
export const LoadingMessage = React.memo<LoadingMessageProps>(
	({ avatarUrl }) => {
		return (
			<div className="flex items-end gap-3">
				<div
					className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-8 h-8 shrink-0"
					style={{
						backgroundImage: `url(${
							avatarUrl || "https://i.pravatar.cc/150?u=agent"
						})`,
					}}
				></div>
				<div className="flex flex-col gap-2 rounded-lg bg-background-light p-4 w-full shadow-sm border border-border-light max-w-sm">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center size-8 rounded-full bg-warning/10 text-warning">
							<svg
								className="animate-spin h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									fill="currentColor"
								></path>
							</svg>
						</div>
						<div className="flex flex-col">
							<p className="font-medium text-text-main">Loading...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}
);
