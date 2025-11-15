import { SidebarTrigger } from "@/components/ui/sidebar";
import { PanelRight } from "lucide-react";

export function ChatHeader({
	title,
	onLeftSidebarToggle,
	onRightSidebarToggle,
}: {
	title: string;
	onLeftSidebarToggle: () => void;
	onRightSidebarToggle: () => void;
}) {
	return (
		<header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
			<div className="flex items-center gap-2">
				<SidebarTrigger onClick={onLeftSidebarToggle} />
				<h2 className="truncate font-semibold">{title}</h2>
			</div>
			<SidebarTrigger onClick={onRightSidebarToggle}>
				<PanelRight />
			</SidebarTrigger>
		</header>
	);
}
