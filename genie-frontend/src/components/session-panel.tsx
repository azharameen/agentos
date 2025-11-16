import React, { useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2 } from "lucide-react";

interface SessionPanelProps {
  conversations: any[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string) => void;
  handleNewChat: () => void;
  handleRename: (id: string, newName: string) => void;
  handleDelete: (id: string) => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  conversations,
  activeConversationId,
  setActiveConversationId,
  handleNewChat,
  handleRename,
  handleDelete,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setNewName(currentName);
  };

  const finishRename = (id: string) => {
    if (newName.trim()) {
      handleRename(id, newName.trim());
    }
    setRenamingId(null);
  };

  return (
    <div>
      <div className="flex flex-col gap-1">
        <button
          className="flex items-center gap-3 rounded-md p-2 text-sm font-medium text-text-light hover:bg-background-dark w-full text-left"
          onClick={handleNewChat}
        >
          <Plus size={16} />
          <span className="truncate">New chat</span>
        </button>
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 rounded-md p-2 text-sm font-medium w-full text-left ${
              c.id === activeConversationId
                ? "bg-muted-blue-100 text-muted-blue-500"
                : "text-text-light hover:bg-background-dark"
            }`}
          >
            <MessageSquare size={16} />
            {renamingId === c.id ? (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={() => finishRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    finishRename(c.id);
                  }
                }}
                className="bg-transparent text-text-main w-full"
                autoFocus
              />
            ) : (
              <>
                <span
                  className="truncate"
                  onClick={() => setActiveConversationId(c.id)}
                >
                  {c.summary}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => startRename(c.id, c.summary)}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
