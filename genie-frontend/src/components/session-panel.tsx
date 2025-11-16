import React from "react";

interface SessionPanelProps {
	conversations: any[];
	activeConversationId: string | null;
	setActiveConversationId: (id: string) => void;
	handleNewChat: () => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
	conversations,
	activeConversationId,
	setActiveConversationId,
	handleNewChat,
}) => {
	return (
		<div>
			<div className="flex flex-col gap-1">
				<button
					className="flex items-center gap-3 rounded-md p-2 text-sm font-medium text-text-light hover:bg-background-dark w-full text-left"
					onClick={handleNewChat}
				>
					<span className="material-symbols-outlined text-xl shrink-0">
						add
					</span>
					<span className="truncate">New chat</span>
				</button>
				{conversations.map((c) => (
					<button
						key={c.id}
						className={`flex items-center gap-3 rounded-md p-2 text-sm font-medium w-full text-left ${
							c.id === activeConversationId
								? "bg-muted-blue-100 text-muted-blue-500"
								: "text-text-light hover:bg-background-dark"
						}`}
						onClick={() => setActiveConversationId(c.id)}
					>
						<span className="material-symbols-outlined text-xl shrink-0">
							chat_bubble
						</span>
						<span className="truncate">{c.summary}</span>
					</button>
				))}
			</div>
		</div>
	);
};
