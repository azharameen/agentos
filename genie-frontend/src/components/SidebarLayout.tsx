import React from "react";

export function SidebarLayout({
	leftSidebar,
	rightSidebar,
	children,
}: {
	leftSidebar: React.ReactNode;
	rightSidebar: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="flex h-screen bg-background text-foreground">
			{leftSidebar}
			<div className="flex flex-1 flex-col overflow-hidden">{children}</div>
			{rightSidebar}
		</div>
	);
}
