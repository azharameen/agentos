"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { MessageList } from "@/components/MessageList";
import type { AnyMessage } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip, Mic, Square, Send } from "lucide-react";

interface ChatUIProps {
  messages: AnyMessage[];
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  hasConversations: boolean;
  hasMessages: boolean;
  onExamplePrompt: (prompt: string) => void;
  prompt: string;
  onPromptChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatUI({
  messages,
  scrollAreaRef,
  hasConversations,
  hasMessages,
  onExamplePrompt,
  prompt,
  onPromptChange,
  onSubmit,
  isStreaming,
  onStop,
}: ChatUIProps) {
  return (
    <>
      <main className="flex-1 overflow-y-auto">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
            {!hasConversations || !hasMessages ? (
              <WelcomeScreen onExamplePrompt={onExamplePrompt} />
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
        </ScrollArea>
      </main>
      <footer className="shrink-0 bg-background">
        <div className="mx-auto w-full max-w-4xl p-4">
          <div className="relative flex items-center rounded-2xl bg-card/70">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground ml-2"
            >
              <Paperclip className="size-5" />
              <span className="sr-only">Attach File</span>
            </Button>
            <Textarea
              value={prompt}
              onChange={onPromptChange}
              placeholder="Ask me to write, code, or create..."
              className="flex-1 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus:outline-none py-3"
              style={{
                minHeight: "2.5rem",
                maxHeight: "12.5rem",
                overflowY: "auto",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as any);
                }
              }}
              disabled={isStreaming}
              rows={1}
            />
            <div className="flex shrink-0 items-center gap-1 self-end p-2">
              {isStreaming ? (
                <Button variant="ghost" size="icon" onClick={onStop}>
                  <Square className="size-5" />
                  <span className="sr-only">Stop</span>
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                  >
                    <Mic className="size-5" />
                    <span className="sr-only">Use Microphone</span>
                  </Button>
                  <Button
                    type="submit"
                    size="icon"
                    onClick={(e) => onSubmit(e as any)}
                    disabled={!prompt.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Send className="size-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
