import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Conversation, AnyMessage } from '@/lib/types';
import { sessionManager } from '@/lib/session-manager';

interface ChatState {
  // State
  conversations: Conversation[];
  activeConversationId: string | null;
  prompt: string;
  selectedModel: string;
  selectedAgent: string;
  selectedTools: string[];

  // Actions
  setConversations: (conversations: Conversation[] | ((prev: Conversation[]) => Conversation[])) => void;
  setActiveConversationId: (id: string | null) => void;
  setPrompt: (prompt: string) => void;
  setSelectedModel: (model: string) => void;
  setSelectedAgent: (agent: string) => void;
  setSelectedTools: (tools: string[]) => void;

  // Computed
  getActiveConversation: () => Conversation | undefined;

  // Complex actions
  addMessage: (conversationId: string, message: AnyMessage) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<AnyMessage>) => void;
  createConversation: (summary: string) => Conversation;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, summary: string) => void;
  clearAllConversations: () => void;
  loadConversations: () => void;
}

/**
 * ZUSTAND STORE: Chat State Management
 * 
 * Centralizes all chat-related state to eliminate prop drilling.
 * Integrated with session manager for persistence.
 * DevTools enabled for debugging.
 */
export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        conversations: [],
        activeConversationId: null,
        prompt: '',
        selectedModel: 'gpt-4',
        selectedAgent: 'default',
        selectedTools: [],

        // Basic setters
        setConversations: (conversations) =>
          set((state) => ({
            conversations: typeof conversations === 'function'
              ? conversations(state.conversations)
              : conversations
          })),
        setActiveConversationId: (id) => set({ activeConversationId: id }),
        setPrompt: (prompt) => set({ prompt }),
        setSelectedModel: (model) => set({ selectedModel: model }),
        setSelectedAgent: (agent) => set({ selectedAgent: agent }),
        setSelectedTools: (tools) => set({ selectedTools: tools }),

        // Computed getters
        getActiveConversation: () => {
          const { conversations, activeConversationId } = get();
          return conversations.find(c => c.id === activeConversationId);
        },

        // Complex actions
        addMessage: (conversationId, message) => {
          set((state) => ({
            conversations: state.conversations.map(c =>
              c.id === conversationId
                ? { ...c, messages: [...c.messages, message] }
                : c
            ),
          }));

          // Sync to session manager
          const conversation = get().conversations.find(c => c.id === conversationId);
          if (conversation) {
            sessionManager.updateSession(conversationId, conversation);
          }
        },

        updateMessage: (conversationId, messageId, updates) => {
          set((state) => ({
            conversations: state.conversations.map(c =>
              c.id === conversationId
                ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.id === messageId ? { ...m, ...updates } as AnyMessage : m
                  ),
                }
                : c
            ),
          }));

          // Sync to session manager
          const conversation = get().conversations.find(c => c.id === conversationId);
          if (conversation) {
            sessionManager.updateSession(conversationId, conversation);
          }
        },

        createConversation: (summary) => {
          const newConversation = sessionManager.createSession(summary);
          set((state) => ({
            conversations: [newConversation, ...state.conversations],
            activeConversationId: newConversation.id,
          }));
          return newConversation;
        },

        deleteConversation: (id) => {
          sessionManager.deleteSession(id);
          set((state) => {
            const remaining = state.conversations.filter(c => c.id !== id);
            return {
              conversations: remaining,
              activeConversationId:
                state.activeConversationId === id
                  ? remaining.length > 0
                    ? remaining[0].id
                    : null
                  : state.activeConversationId,
            };
          });
        },

        renameConversation: (id, summary) => {
          sessionManager.renameSession(id, summary);
          set((state) => ({
            conversations: state.conversations.map(c =>
              c.id === id ? { ...c, summary } : c
            ),
          }));
        },

        clearAllConversations: () => {
          sessionManager.clearAll();
          set({
            conversations: [],
            activeConversationId: null,
            prompt: '',
          });
        },

        loadConversations: () => {
          const loaded = sessionManager.getAllSessions();
          set({
            conversations: loaded,
            activeConversationId: loaded.length > 0 ? loaded[0].id : null,
          });
        },
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          activeConversationId: state.activeConversationId,
          selectedModel: state.selectedModel,
          selectedAgent: state.selectedAgent,
          selectedTools: state.selectedTools,
        }),
      }
    ),
    { name: 'ChatStore' }
  )
);
