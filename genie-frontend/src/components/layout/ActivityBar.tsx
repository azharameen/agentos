import React from "react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface ActivityItem {
    id: string;
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
}

interface ActivityBarProps {
    items: ActivityItem[];
    activeId?: string | null;
    className?: string;
    position?: "left" | "right";
}

export function ActivityBar({
    items,
    activeId,
    className,
    position = "left",
}: ActivityBarProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-2 p-2 bg-background border-border",
                position === "left" ? "border-r" : "border-l",
                className
            )}
        >
            <TooltipProvider delayDuration={0}>
                {items.map((item) => (
                    <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                            <Button
                                variant={activeId === item.id ? "secondary" : "ghost"}
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-md",
                                    activeId === item.id && "bg-muted text-foreground"
                                )}
                                onClick={() => item.onClick?.()}
                                aria-label={item.label}
                            >
                                <item.icon className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side={position === "left" ? "right" : "left"}>
                            <p>{item.label}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    );
}
