'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/lib/types';
import { Copy, ThumbsDown, ThumbsUp, Bookmark } from 'lucide-react';

const MessageActions = ({ message }: { message: Message }) => {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      description: 'Message copied to clipboard.',
    });
  };

  return (
    <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border bg-secondary p-1 opacity-0 transition-opacity group-hover:opacity-100">
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

type UserMessageProps = {
  message: Message;
};

export const UserMessage = ({ message }: UserMessageProps) => {
  const userName = message.name || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="group relative flex items-start justify-end gap-4">
       <MessageActions message={message} />
      <Card className="max-w-[85%] bg-secondary text-secondary-foreground">
        <CardContent className="p-3 md:p-4">
          <div className="whitespace-pre-wrap text-base">{message.content}</div>
        </CardContent>
      </Card>
      <Avatar className="size-9">
        {message.avatarUrl && <AvatarImage src={message.avatarUrl} alt={userName} />}
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>
    </div>
  );
};
