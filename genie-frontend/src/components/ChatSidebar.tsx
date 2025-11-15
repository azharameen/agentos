import {
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgenticaIcon } from "./icons";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import type { Conversation } from "@/lib/types";

export function ChatSidebar({
	conversations,
	activeConversationId,
	setActiveConversationId,
	handleNewChat,
}: {
	conversations: Conversation[];
	activeConversationId: string | null;
	setActiveConversationId: (id: string) => void;
	handleNewChat: () => void;
}) {
	return (
		<Sidebar side="left" isOpen={true} setIsOpen={() => {}} isMobile={false}>
			<SidebarHeader>
				<div className="flex items-center gap-2 p-1">
					<AgenticaIcon className="size-7" />
					<h1 className="text-lg font-semibold truncate">Agentica</h1>
				</div>
				<Button
					onClick={handleNewChat}
					variant="ghost"
					size="sm"
					className="w-full justify-start"
				>
					<MessageSquarePlus className="mr-2 size-4" />
					<span className="truncate">New Chat</span>
				</Button>
			</SidebarHeader>
			<Separator />
			<SidebarContent className="p-2">
				<ScrollArea className="h-full">
					<SidebarMenu>
						{conversations.map((c) => (
							<SidebarMenuItem key={c.id}>
								<SidebarMenuButton
									isActive={c.id === activeConversationId}
									onClick={() => setActiveConversationId(c.id)}
									className="justify-start"
									aria-label={c.summary}
								>
									<span className="truncate">{c.summary}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</ScrollArea>
			</SidebarContent>
		</Sidebar>
	);
}
