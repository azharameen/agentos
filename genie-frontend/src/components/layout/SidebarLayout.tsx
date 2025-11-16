import React from "react";

export function SidebarLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <aside className="w-80 h-full flex flex-col border-r border-border-light bg-background-light p-4 z-10 shrink-0">
        {sidebar}
      </aside>
      <div className="flex-1 overflow-hidden main-content">{children}</div>
    </div>
  );
}
