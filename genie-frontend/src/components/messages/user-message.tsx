"use client";

import type { Message } from "@/lib/types";
import ReactMarkdown from "react-markdown";

type UserMessageProps = {
	message: Message;
};

export const UserMessage = ({ message }: UserMessageProps) => {
	const userName = message.name || "You";
	const timestamp = message.createdAt
		? new Date(message.createdAt).toLocaleTimeString()
		: new Date().toLocaleTimeString();

	return (
		<div className="flex items-end gap-3 self-end">
			<div className="flex flex-1 flex-col gap-1 items-end">
				<p className="text-text-light text-xs font-medium">
					{userName} · {timestamp}
				</p>
				<div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-br-none px-4 py-2 bg-muted-blue-500 text-white markdown-message">
					<ReactMarkdown>
						{message.content.replaceAll("\n", "  \n")}
					</ReactMarkdown>
				</div>
			</div>
		</div>
	);
};
