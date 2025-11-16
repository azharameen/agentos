"use client";

import type { Message } from "@/lib/types";
import ReactMarkdown from "react-markdown";

type AgentMessageProps = {
	message: Message;
};

export const AgentMessage = ({ message }: AgentMessageProps) => {
	const agentName = message.name || "Genie";
	const timestamp = message.createdAt
		? new Date(message.createdAt).toLocaleTimeString()
		: new Date().toLocaleTimeString();

	return (
		<div className="flex items-end gap-3">
			<div
				className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-8 h-8 shrink-0"
				style={{
					backgroundImage: `url(${
						message.avatarUrl || `https://i.pravatar.cc/150?u=${agentName}`
					})`,
				}}
			></div>
			<div className="flex flex-1 flex-col gap-1 items-start">
				<p className="text-text-light text-xs font-medium">
					{agentName} · {timestamp}
				</p>
				<div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-bl-none px-4 py-2 bg-background-light text-text-main shadow-sm border border-border-light markdown-message">
					<ReactMarkdown>{message.content}</ReactMarkdown>
					{message.isStreaming && <span className="animate-pulse">�</span>}
				</div>
			</div>
		</div>
	);
};
