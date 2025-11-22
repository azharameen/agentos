"use client";

import React from "react";
import type { Message } from "@/lib/types";
import { User } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown";

type UserMessageProps = {
	message: Message;
};

/**
 * PERFORMANCE: Memoized to prevent re-renders when message hasn't changed
 * 
 * Uses the new industry-standard markdown system with full optimization
 */
export const UserMessage = React.memo<UserMessageProps>(
	({ message }) => {
		const timestamp = message.createdAt
			? new Date(message.createdAt).toLocaleTimeString()
			: new Date().toLocaleTimeString();

		return (
			<div className="flex items-end gap-3 self-end">
				<div className="flex flex-1 flex-col gap-1 items-end">
					<p className="text-text-light text-xs font-medium">{timestamp}</p>
					<div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-br-none px-4 py-2 bg-muted-blue-500 text-white markdown-message">
						<MarkdownRenderer
							content={message.content.replaceAll("\n", "  \n")}
							enableMemoization={false}
						/>
					</div>
				</div>
				<div className="flex-shrink-0 size-8 bg-gray-300 rounded-full text-gray-600 flex items-center justify-center">
					<User size={20} />
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		// PERFORMANCE: Only re-render if message content or id changes
		return (
			prevProps.message.id === nextProps.message.id &&
			prevProps.message.content === nextProps.message.content
		);
	}
);

UserMessage.displayName = 'UserMessage';
