import React from "react";
import { UserMessage } from "./messages/user-message";
import { AgentMessage } from "./messages/agent-message";
import { ToolCallMessage } from "./messages/tool-call-message";
import { LoadingMessage } from "./messages/loading-message";
import { ContextMessage } from "./messages/context-message";
import { ErrorMessage } from "./messages/error-message";
import type { AnyMessage } from "@/lib/types";

interface MessageListProps {
	messages: AnyMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
	if (!messages || messages.length === 0) return null;
	// Deduplicate messages by id
	const uniqueMessages = Array.from(
		new Map(messages.map((m) => [m.id, m])).values()
	);
	return (
		<>
			{uniqueMessages.map((message) => {
				switch (message.type) {
					case "text":
						if (message.role === "user") {
							return <UserMessage key={message.id} message={message} />;
						}
						return <AgentMessage key={message.id} message={message} />;
					case "tool-call":
						return <ToolCallMessage key={message.id} message={message} />;
					case "loading":
						return <LoadingMessage key={message.id} message={message} />;
					case "context":
						return <ContextMessage key={message.id} message={message} />;
					case "error":
						return <ErrorMessage key={message.id} message={message} />;
					default:
						return null;
				}
			})}
		</>
	);
};
