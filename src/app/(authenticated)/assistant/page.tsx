'use client';

import { useEffect, useState, useRef, type KeyboardEvent } from 'react';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

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
  messages?: { content: string; createdAt: string }[];
}

const QUICK_ACTIONS = [
  'Any laptops available?',
  'Show pending orders',
  "What's in stock?",
  'Dashboard stats',
  'List active vendors',
];

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function renderMarkdown(content: string): string {
  let html = content
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="my-2 rounded-lg bg-muted p-3 text-xs overflow-x-auto"><code>$2</code></pre>'
    )
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>'
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n/g, '<br/>');

  html = html.replace(
    /((?:<li class="ml-4 list-disc">.*?<\/li><br\/>?)+)/g,
    '<ul class="my-1 space-y-0.5">$1</ul>'
  );
  html = html.replace(
    /((?:<li class="ml-4 list-decimal">.*?<\/li><br\/>?)+)/g,
    '<ol class="my-1 space-y-0.5">$1</ol>'
  );

  return html;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-1 flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Focus input when active conversation changes
  useEffect(() => {
    if (activeId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeId]);

  async function loadConversations() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/assistant/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function selectConversation(id: string) {
    setActiveId(id);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNewConversation() {
    try {
      const res = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => [data.data, ...prev]);
        setActiveId(data.data.id);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/assistant/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;

    let convoId = activeId;
    if (!convoId) {
      try {
        const res = await fetch('/api/assistant/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.success) {
          convoId = data.data.id;
          setConversations((prev) => [data.data, ...prev]);
          setActiveId(convoId);
        }
      } catch {
        return;
      }
    }

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch(
        `/api/assistant/conversations/${convoId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
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
  }

  async function handleQuickAction(action: string) {
    if (isSending) return;
    if (!activeId) {
      await handleNewConversation();
    }
    setInput(action);
    // Need to wait for state, so we send directly
    const text = action;
    let convoId = activeId;
    if (!convoId) {
      // The conversation was just created in handleNewConversation
      convoId = conversations[0]?.id;
      if (!convoId) return;
      setActiveId(convoId);
    }

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch(
        `/api/assistant/conversations/${convoId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
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
        loadConversations();
      }
    } catch {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'ASSISTANT',
        content: 'Sorry, something went wrong. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showEmptyState = !activeId;
  const showWelcome = activeId && messages.length === 0 && !isLoading;

  return (
    <div className="flex h-full -m-6">
      {/* Sidebar */}
      <div
        className={`flex flex-col border-r bg-card transition-all duration-200 ${
          sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNewConversation}
            aria-label="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-0.5 p-2">
            {isLoading && conversations.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg p-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-1.5 h-3 w-24" />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No conversations yet.
                <br />
                Start a new one!
              </div>
            ) : (
              conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={`group flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                    activeId === convo.id
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => selectConversation(convo.id)}
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {convo.title || 'New Conversation'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(convo.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(convo.id);
                    }}
                    className="mt-0.5 hidden shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-3 border-b bg-card px-6 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green/10">
            <Bot className="h-4 w-4 text-brand-green" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Inventory management copilot
            </p>
          </div>
        </div>

        {/* Empty state (no conversation selected) */}
        {showEmptyState && (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green/10">
              <Sparkles className="h-8 w-8 text-brand-green" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">AI Assistant</h2>
            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
              Your intelligent inventory management copilot. Ask questions about
              assets, orders, vendors, and more.
            </p>
            <Button
              onClick={handleNewConversation}
              className="mt-6 gap-2 bg-brand-green text-white hover:bg-brand-green/90"
            >
              <Plus className="h-4 w-4" />
              New Conversation
            </Button>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-green hover:text-brand-green"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active conversation */}
        {activeId && (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {showWelcome && (
                <div className="flex flex-col items-center justify-center px-6 py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green/10">
                    <Sparkles className="h-7 w-7 text-brand-green" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">
                    How can I help?
                  </h3>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    Ask me about inventory, orders, vendors, or asset
                    management.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-green hover:text-brand-green"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === 'USER';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 px-6 py-3 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div
                      className={`flex max-w-[70%] flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isUser
                            ? 'rounded-tr-sm bg-brand-green text-white'
                            : 'rounded-tl-sm bg-muted'
                        }`}
                      >
                        {isUser ? (
                          msg.content
                        ) : (
                          <div
                            className="prose-sm [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(msg.content),
                            }}
                          />
                        )}
                      </div>
                      <span className="mt-1 text-[10px] text-muted-foreground">
                        {timeAgo(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isSending && <TypingIndicator />}

              {isLoading && messages.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t bg-card p-4">
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about inventory, orders, vendors..."
                    rows={1}
                    className="max-h-32 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button
                    size="icon-sm"
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    className="shrink-0 rounded-lg bg-brand-green text-white hover:bg-brand-green/90 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  AI responses may not always be accurate. Verify important
                  data.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
