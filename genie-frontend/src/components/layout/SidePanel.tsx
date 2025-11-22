import React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidePanelProps {
    isOpen: boolean;
    title?: string;
    children: React.ReactNode;
    className?: string;
    width?: string;
    position?: "left" | "right";
}

export function SidePanel({
    isOpen,
    title,
    children,
    className,
    width = "w-80",
    position = "left",
}: SidePanelProps) {
    return (
        <div
            className={cn(
                "flex flex-col bg-background border-border transition-all duration-300 ease-in-out overflow-hidden",
                position === "left" ? "border-r" : "border-l",
                isOpen ? width : "w-0 opacity-0",
                className
            )}
        >
            <div className={cn("flex flex-col h-full", !isOpen && "invisible")}>
                {title && (
                    <div className="p-4 border-b border-border">
                        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                    </div>
                )}
                <ScrollArea className="flex-1">
                    <div className="p-4">{children}</div>
                </ScrollArea>
            </div>
        </div>
    );
}
