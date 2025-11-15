"use client";

import React from "react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AgenticaIcon } from "@/components/icons";
import { MessageSquarePlus, Trash2, Edit } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LeftSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, newName: string) => void;
}

export function LeftSidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onConversationSelect,
  onConversationDelete,
  onConversationRename,
}: LeftSidebarProps) {
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");

  const handleRename = (id: string) => {
    onConversationRename(id, newName);
    setEditingConversationId(null);
    setNewName("");
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-1">
          <AgenticaIcon className="size-7" />
          <h1 className="text-lg font-semibold truncate">Agentica</h1>
        </div>
        <Button
          onClick={onNewChat}
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
                {editingConversationId === c.id ? (
                  <div className="flex items-center gap-2 p-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(c.id)}
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRename(c.id)}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <SidebarMenuButton
                      isActive={c.id === activeConversationId}
                      onClick={() => onConversationSelect(c.id)}
                      className="justify-start flex-1"
                      aria-label={c.summary}
                    >
                      <span className="truncate">{c.summary}</span>
                    </SidebarMenuButton>
                    <div className="flex items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingConversationId(c.id);
                          setNewName(c.summary);
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently
                              delete the conversation.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onConversationDelete(c.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
    </>
  );
}
