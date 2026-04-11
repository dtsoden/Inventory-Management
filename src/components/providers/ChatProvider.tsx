'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { apiFetch } from '@/lib/client/BaseApiClient';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

interface ChatContextValue {
  isPanelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  conversations: Conversation[];
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  sendMessage: (message: string) => Promise<void>;
  createConversation: () => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const togglePanel = useCallback(() => setIsPanelOpen((p) => !p), []);
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/assistant/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/assistant/conversations/${id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
        setActiveConversationId(id);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async () => {
    try {
      const res = await apiFetch('/api/assistant/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setActiveConversationId(data.data.id);
        setMessages([]);
        setConversations((prev) => [data.data, ...prev]);
        return data.data.id as string;
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
    return null;
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      let convoId = activeConversationId;
      if (!convoId) {
        convoId = await createConversation();
        if (!convoId) return;
      }

      // Optimistically add user message
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        role: 'USER',
        content: message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setIsSending(true);

      try {
        const res = await apiFetch(
          `/api/assistant/conversations/${convoId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
          }
        );
        const data = await res.json();
        if (data.success) {
          const assistantMsg: Message = {
            id: `msg-${Date.now()}`,
            role: 'ASSISTANT',
            content: data.data.content,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Refresh conversation list to get updated titles
          loadConversations();
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'ASSISTANT',
          content:
            'Sorry, I encountered an error processing your request. Please try again.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, createConversation, loadConversations]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/assistant/conversations/${id}`, {
          method: 'DELETE',
        });
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [activeConversationId]
  );

  return (
    <ChatContext.Provider
      value={{
        isPanelOpen,
        togglePanel,
        openPanel,
        closePanel,
        activeConversationId,
        setActiveConversationId,
        conversations,
        messages,
        isLoading,
        isSending,
        sendMessage,
        createConversation,
        deleteConversation,
        loadConversations,
        loadConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
