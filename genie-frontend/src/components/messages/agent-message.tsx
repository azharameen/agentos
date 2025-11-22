"use client";

import React from "react";
import { Bot, Copy, Bookmark } from "lucide-react";
import type { Message } from "@/lib/types";
import { SuggestedActions } from "../SuggestedActions";
import { MarkdownRenderer } from "@/components/markdown";

type AgentMessageProps = {
	message: Message;
};

/**
 * PERFORMANCE: Memoized to prevent re-renders when message hasn't changed
 * Note: isStreaming is intentionally NOT in comparison to allow streaming updates
 * 
 * Uses the new industry-standard markdown system with full optimization
 */
export const AgentMessage = React.memo<AgentMessageProps>(
	({ message }) => {
		const timestamp = message.createdAt
			? new Date(message.createdAt).toLocaleTimeString()
			: new Date().toLocaleTimeString();

		const handleCopy = () => {
			navigator.clipboard.writeText(message.content);
		};

		const handleSaveAsKnowledge = () => {
			// Placeholder: Implement save as knowledge logic
			alert("Save as knowledge triggered!");
		};

		return (
			<div className="flex items-start gap-3 group">
				<div className="flex-shrink-0 size-8 bg-muted-blue-500 rounded-full text-white flex items-center justify-center">
					<Bot size={20} />
				</div>
				<div className="flex flex-1 flex-col gap-1 items-start">
					<div className="text-text-light text-xs font-medium">{timestamp}</div>
					<div className="relative w-full">
						<div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-bl-none px-4 py-2 bg-background-light text-text-main shadow-sm border border-border-light prose prose-sm dark:prose-invert max-w-none break-words">
							<MarkdownRenderer
								content={message.content}
								isStreaming={message.isStreaming}
								enableMemoization={true}
							/>
						</div>
						<div className="absolute bottom-0 right-0 mb-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
							<button
								title="Copy"
								className="p-1 rounded-md hover:bg-background-dark text-text-light"
								onClick={handleCopy}
							>
								<Copy size={14} />
							</button>
							<button
								title="Save as Knowledge"
								className="p-1 rounded-md hover:bg-background-dark text-text-light"
								onClick={handleSaveAsKnowledge}
							>
								<Bookmark size={14} />
							</button>
						</div>
					</div>
					{message.suggestedActions && message.suggestedActions.length > 0 && (
						<div className="w-full max-w-2xl">
							<SuggestedActions
								actions={message.suggestedActions}
								onActionClick={(action) => {
									console.log("Action clicked:", action);
									// TODO: Implement action execution
								}}
							/>
						</div>
					)}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// PERFORMANCE: Re-render if content, streaming state, or suggested actions change
		if (prevProps.message.id !== nextProps.message.id) return false;
		if (prevProps.message.content !== nextProps.message.content) return false;
		if (prevProps.message.isStreaming !== nextProps.message.isStreaming)
			return false;

		// Check suggested actions
		const prevActions = prevProps.message.suggestedActions?.length ?? 0;
		const nextActions = nextProps.message.suggestedActions?.length ?? 0;
		return prevActions === nextActions;
	}
);

AgentMessage.displayName = 'AgentMessage';
