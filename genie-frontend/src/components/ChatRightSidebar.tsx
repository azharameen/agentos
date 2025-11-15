import {
	Sidebar,
	SidebarHeader,
	SidebarContent,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function ChatRightSidebar() {
	return (
		<Sidebar side="right" isOpen={true} setIsOpen={() => {}} isMobile={false}>
			<SidebarHeader>
				<div className="flex items-center gap-2 p-1">
					<h1 className="truncate text-lg font-semibold">Context</h1>
				</div>
			</SidebarHeader>
			<Separator />
			<SidebarContent className="p-4">
				<p className="text-sm text-muted-foreground">
					Contextual information and tools will appear here.
				</p>
			</SidebarContent>
		</Sidebar>
	);
}
