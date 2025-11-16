"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PanelRight } from "lucide-react";

interface HeaderProps {
  activeConversation?: { summary?: string } | null;
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
}

export function Header({
  activeConversation,
  onLeftSidebarToggle,
  onRightSidebarToggle,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm"> 
      <div className="flex items-center gap-2"> 
        <SidebarTrigger onClick={onLeftSidebarToggle} />
        <h2 className="truncate font-semibold"> 
          {activeConversation?.summary ?? "Agentica AI Chat"}
        </h2> 
      </div> 
      <SidebarTrigger onClick={onRightSidebarToggle}> 
        <PanelRight />
      </SidebarTrigger>
    </header>
  );
}