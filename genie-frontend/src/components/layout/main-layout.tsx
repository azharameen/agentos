"use client";

import React from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { TooltipProvider } from "@/components/ui/tooltip";

interface MainLayoutProps {
  children: React.ReactNode;
  leftSidebar: React.ReactNode;
  rightSidebar: React.ReactNode;
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export function MainLayout({
  children,
  leftSidebar,
  rightSidebar,
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
}: MainLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar
          side="left"
          isOpen={leftSidebarOpen}
          setIsOpen={setLeftSidebarOpen}
          isMobile={isMobile}
        >
          {leftSidebar}
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>

        <Sidebar
          side="right"
          isOpen={rightSidebarOpen}
          setIsOpen={setRightSidebarOpen}
          isMobile={isMobile}
        >
          {rightSidebar}
        </Sidebar>
      </div>
    </TooltipProvider>
  );
}