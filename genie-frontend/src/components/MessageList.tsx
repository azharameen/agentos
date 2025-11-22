import React, { useMemo } from "react";
import { UserMessage } from "./messages/user-message";
import { AgentMessage } from "./messages/agent-message";
import { StreamingMessage } from "./messages/streaming-message";
import { ToolCallMessage } from "./messages/tool-call-message";
import { LoadingMessage } from "./messages/loading-message";
import { ContextMessage } from "./messages/context-message";
import { ErrorMessage } from "./messages/error-message";
import type { AnyMessage } from "@/lib/types";

interface MessageListProps {
	messages: AnyMessage[];
}

/**
 * PERFORMANCE: Memoized MessageList to prevent unnecessary re-renders
 * Only re-renders when messages array reference changes
 * 
 * NEW: Supports StreamingMessage type for GitHub Copilot-style inline streaming
 */
export const MessageList = React.memo<MessageListProps>(
	({ messages }) => {
		// PERFORMANCE: Memoize deduplication logic
		const uniqueMessages = useMemo(() => {
			if (!messages || messages.length === 0) return [];
			return Array.from(new Map(messages.map((m) => [m.id, m])).values());
		}, [messages]);

		if (uniqueMessages.length === 0) return null;

		return (
			<div className="message-list-container">
				{uniqueMessages.map((message, index) => {
					switch (message.type) {
						case "text":
							if (message.role === "user") {
								return <UserMessage key={message.id} message={message} />;
							}
							return <AgentMessage key={message.id} message={message} />;
						case "streaming":
							// NEW: GitHub Copilot-style streaming message with inline content blocks
							return <StreamingMessage key={message.id} message={message} />;
						case "tool-call":
							return <ToolCallMessage key={message.id} message={message} />;
						case "loading": {
							const lastMessage = uniqueMessages[index - 1];
							const avatarUrl =
								lastMessage &&
								lastMessage.role === "assistant" &&
								"avatarUrl" in lastMessage
									? lastMessage.avatarUrl
									: undefined;
							return <LoadingMessage key={message.id} avatarUrl={avatarUrl} />;
						}
						case "context":
							return <ContextMessage key={message.id} message={message} />;
						case "error":
							return <ErrorMessage key={message.id} message={message} />;
						default:
							return null;
					}
				})}
			</div>
		);
	},
	(prevProps, nextProps) => {
		// PERFORMANCE: Custom comparison - only re-render if messages array changes
		// Compare array length and last message ID for efficient deep check
		if (prevProps.messages.length !== nextProps.messages.length) return false;
		if (prevProps.messages.length === 0) return true;
		const prevLastId = prevProps.messages[prevProps.messages.length - 1]?.id;
		const nextLastId = nextProps.messages[nextProps.messages.length - 1]?.id;
		return prevLastId === nextLastId;
	}
);
