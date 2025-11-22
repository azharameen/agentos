"use client";

import React from "react";
import { Bot, Copy, Bookmark, Info } from "lucide-react";
import type { StreamingMessage as StreamingMessageType } from "@/lib/types";
import { ToolCallBlock } from "./tool-call-block";
import { MarkdownRenderer } from "@/components/markdown";

type StreamingMessageProps = {
	message: StreamingMessageType;
};

/**
 * StreamingMessage - GitHub Copilot Style
 * Renders a single assistant response with inline content blocks:
 * - Text content flows continuously
 * - Tool calls appear inline with status
 * - Context blocks show at the top
 * - No speech bubbles, left-aligned, continuous content
 * 
 * Uses the new industry-standard markdown system with full optimization
 */
export const StreamingMessage = React.memo<StreamingMessageProps>(
	({ message }) => {
		const timestamp = message.createdAt
			? new Date(message.createdAt).toLocaleTimeString()
			: new Date().toLocaleTimeString();

		// Collect all text content for copy
		const allText = message.contentBlocks
			.filter((block) => block.type === "text")
			.map((block) => (block.type === "text" ? block.content : ""))
			.join("\n");

		const handleCopyAll = () => {
			navigator.clipboard.writeText(allText);
		};

		const handleSaveAsKnowledge = () => {
			// Placeholder: Implement save as knowledge logic
			alert("Save as knowledge triggered!");
		};

		return (
			<div className="streaming-message-container py-4 group">
				{/* Header */}
				<div className="flex items-center gap-2 mb-2">
					<div className="size-6 bg-muted-blue-500 rounded-full text-white flex items-center justify-center">
						<Bot size={16} />
					</div>
					<div className="text-text-light text-xs font-medium">
						Genie • {timestamp}
					</div>
					<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
						<button
							title="Copy all"
							className="p-1 rounded-md hover:bg-background-dark text-text-light"
							onClick={handleCopyAll}
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

				{/* Content Blocks (inline, no bubbles) */}
				<div className="streaming-content pl-8">
					{message.contentBlocks.map((block, index) => {
						switch (block.type) {
							case "text":
								return (
									<div
										key={`text-${index}`}
										className="text-content prose prose-sm dark:prose-invert max-w-none text-text-main break-words"
									>
										<MarkdownRenderer
											content={block.content}
											isStreaming={message.isStreaming}
											enableMemoization={true}
										/>
									</div>
								);

							case "tool-call":
								return (
									<div
										key={`tool-${block.toolCallId}`}
										className="tool-content my-2"
									>
										<ToolCallBlock block={block} />
									</div>
								);

							case "context":
								return (
									<div
										key={`context-${index}`}
										className="context-content my-2 p-3 bg-background-light rounded-lg border border-border-light"
									>
										<div className="flex items-start gap-2">
											<Info
												size={16}
												className="text-muted-blue-500 mt-1 flex-shrink-0"
											/>
											<div className="flex-1">
												<div className="text-xs font-medium text-text-light mb-1">
													Context from {block.source || "RAG"}
												</div>
												<div className="text-sm text-text-main">
													{block.content}
												</div>
											</div>
										</div>
									</div>
								);

							default:
								return null;
						}
					})}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// Re-render if content blocks change or streaming state changes
		if (prevProps.message.id !== nextProps.message.id) return false;
		if (prevProps.message.isStreaming !== nextProps.message.isStreaming)
			return false;
		return (
			prevProps.message.contentBlocks.length ===
			nextProps.message.contentBlocks.length
		);
	}
);

StreamingMessage.displayName = 'StreamingMessage';
