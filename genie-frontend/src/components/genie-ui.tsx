"use client";

import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import React, { useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { SessionPanel } from "./session-panel";
import { MemoryPanel } from "./memory-panel";
import { KnowledgeBasePanel } from "./knowledge-base-panel";
import { ContextPanel } from "./context-panel";
import { SidebarLayout } from "./layout/SidebarLayout";
import { useUIState } from "@/context/ui-state-context";
import { useChat } from "@/hooks/use-chat";
import {
  MessageCircle,
  BrainCircuit,
  Book,
  Settings,
  CircleUserRound,
  Mic,
  Paperclip,
  Send,
  PanelRightClose,
  PanelLeftClose,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { WelcomeScreen } from "./WelcomeScreen";

export function GenieUI() {
  const {
    isLeftSidebarOpen,
    activeLeftPanel,
    isRightPanelOpen,
    toggleLeftSidebar,
    setRightPanelOpen,
  } = useUIState();

  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    prompt,
    setPrompt,
    isPending,
    handleSubmit,
    handleNewChat,
    activeConversation,
  } = useChat();

  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isMobile) {
      setRightPanelOpen(false);
    }
  }, [isMobile, setRightPanelOpen]);

  const handleSheetOpenChange = (open: boolean) => {
    if (open) {
      toggleLeftSidebar(activeLeftPanel);
    } else {
      toggleLeftSidebar();
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <div className="flex h-full flex-1">
        <aside className="flex h-full flex-col border-r border-border-light bg-background-light p-2 z-20 shrink-0">
          <div className="flex flex-col items-center gap-2">
            <button
              className={`flex items-center justify-center rounded-lg p-2.5 ${
                activeLeftPanel === "sessions" && isLeftSidebarOpen
                  ? "text-white bg-muted-blue-500"
                  : "text-text-light hover:bg-background-dark"
              }`}
              onClick={() => toggleLeftSidebar("sessions")}
              aria-label="Toggle Sessions Panel"
            >
              <MessageCircle size={24} />
            </button>
            <button
              className={`flex items-center justify-center rounded-lg p-2.5 ${
                activeLeftPanel === "memory" && isLeftSidebarOpen
                  ? "text-white bg-muted-blue-500"
                  : "text-text-light hover:bg-background-dark"
              }`}
              onClick={() => toggleLeftSidebar("memory")}
              aria-label="Toggle Memory Panel"
            >
              <BrainCircuit size={24} />
            </button>
            <button
              className={`flex items-center justify-center rounded-lg p-2.5 ${
                activeLeftPanel === "kb" && isLeftSidebarOpen
                  ? "text-white bg-muted-blue-500"
                  : "text-text-light hover:bg-background-dark"
              }`}
              onClick={() => toggleLeftSidebar("kb")}
              aria-label="Toggle Knowledge Base Panel"
            >
              <Book size={24} />
            </button>
          </div>
          <div className="mt-auto flex flex-col items-center gap-2 pt-4">
            <button className="flex items-center justify-center rounded-lg p-2.5 text-text-light hover:bg-background-dark" aria-label="Settings">
              <Settings size={24} />
            </button>
            <button className="flex items-center justify-center rounded-lg p-2.5 text-text-light hover:bg-background-dark" aria-label="User Profile">
              <CircleUserRound size={24} />
            </button>
          </div>
        </aside>
        {isMobile ? (
          <Sheet open={isLeftSidebarOpen} onOpenChange={handleSheetOpenChange}>
            <SheetContent side="left" className="p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        ) : (
          isLeftSidebarOpen && (
            <SidebarLayout sidebar={<SidebarContent />}>
              <ChatArea />
            </SidebarLayout>
          )
        )}
        {!isLeftSidebarOpen && !isMobile && <ChatArea />}
        {isMobile && <ChatArea />}
        <div
          className={`absolute inset-y-0 right-0 w-80 bg-background-light border-l border-border-light shadow-xl z-30 transition-transform duration-300 ease-in-out ${
            isRightPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <ContextPanel setRightPanelOpen={setRightPanelOpen} />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40">
          <button
            className="flex items-center justify-center size-10 rounded-full bg-background-light text-text-main shadow-lg hover:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border border-border-light"
            onClick={() => setRightPanelOpen(!isRightPanelOpen)}
            title="Toggle right sidebar"
            aria-label="Toggle right sidebar"
          >
            {isRightPanelOpen ? <PanelRightClose /> : <PanelLeftClose />}
          </button>
        </div>
      </div>
    </div>
  );
}

const SidebarContent = () => {
  const {
    activeLeftPanel,
  } = useUIState();
  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    handleNewChat,
  } = useChat();

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-main">
          {activeLeftPanel === "sessions"
            ? "Sessions"
            : activeLeftPanel === "memory"
            ? "Memory"
            : "Knowledge Base"}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeLeftPanel === "sessions" && (
          <SessionPanel
            conversations={conversations}
            activeConversationId={activeConversationId}
            setActiveConversationId={setActiveConversationId}
            handleNewChat={handleNewChat}
            handleRename={(id, newName) => {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === id ? { ...c, summary: newName } : c
                )
              );
            }}
            handleDelete={(id) => {
              setConversations((prev) =>
                prev.filter((c) => c.id !== id)
              );
              if (activeConversationId === id) {
                setActiveConversationId(null);
              }
            }}
          />
        )}
        {activeLeftPanel === "memory" && <MemoryPanel />}
        {activeLeftPanel === "kb" && <KnowledgeBasePanel />}
      </div>
    </>
  );
};

const ChatArea = () => {
  const {
    prompt,
    setPrompt,
    handleSubmit,
    isPending,
    activeConversation,
  } = useChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <main className="relative flex flex-1 flex-col bg-soft-cream h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          {activeConversation?.messages?.length ? (
            <MessageList messages={activeConversation.messages} />
          ) : (
            <WelcomeScreen onExamplePrompt={handleSubmit} />
          )}
        </div>
      </div>
      <div className="border-t border-border-light bg-background-light p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 rounded-xl bg-background-light p-2 shadow-sm border border-border-light focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <button
              className="shrink-0 flex items-center justify-center size-9 rounded-lg hover:bg-background-dark text-text-light"
              aria-label="Record Message"
            >
              <Mic size={20} />
            </button>
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your message..."
              className="form-textarea w-full resize-none border-0 bg-transparent p-2 text-text-main placeholder:text-text-light focus:ring-0"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isPending}
            />
            <div className="relative group">
              <input type="file" id="file-upload" className="hidden" aria-label="Attach File" />
              <label
                htmlFor="file-upload"
                className="shrink-0 flex items-center justify-center size-9 rounded-lg hover:bg-background-dark text-text-light cursor-pointer"
                aria-label="Attach File"
              >
                <Paperclip size={20} />
              </label>
            </div>
            <button
              className="shrink-0 flex items-center justify-center size-9 rounded-lg bg-muted-blue-500 text-white hover:bg-muted-blue-500/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
              onClick={() => handleSubmit()}
              disabled={!prompt.trim()}
              aria-label="Send Message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
