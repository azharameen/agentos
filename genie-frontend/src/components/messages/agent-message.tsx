'use client';

import { Bot, Copy, ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/types';

const MessageActions = ({ message }: { message: Message }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      description: 'Message copied to clipboard.',
    });
  };

  return (
    <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border bg-secondary p-1 opacity-0 transition-opacity group-hover:opacity-100">
      <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy}>
        <Copy className="size-4" />
        <span className="sr-only">Copy</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-7">
        <ThumbsUp className="size-4" />
        <span className="sr-only">Like</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-7">
        <ThumbsDown className="size-4" />
        <span className="sr-only">Dislike</span>
      </Button>
      <Button variant="ghost" size="icon" className="size-7">
        <Bookmark className="size-4" />
        <span className="sr-only">Save</span>
      </Button>
    </div>
  );
};


type AgentMessageProps = {
  message: Message;
};

export const AgentMessage = ({ message }: AgentMessageProps) => {
  if (message.isStreaming && message.content === '') {
    return <AgentMessage.Skeleton />;
  }

  return (
    <div className="group relative flex items-start gap-4">
      <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
        <Bot className="size-5 text-primary" />
      </div>
      <Card className="max-w-[85%] bg-card">
        <CardContent className="prose prose-invert max-w-none p-3 prose-p:my-2 prose-p:leading-relaxed md:p-4">
          <div className="whitespace-pre-wrap text-base text-foreground">
            {message.content}
            {message.isStreaming && <span className="animate-pulse">▍</span>}
          </div>
        </CardContent>
      </Card>
      {!message.isStreaming && <MessageActions message={message} />}
    </div>
  );
};

AgentMessage.Skeleton = function AgentMessageSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
        <Bot className="size-5 text-primary" />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
};
