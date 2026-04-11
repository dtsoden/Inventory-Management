'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatContext } from '@/components/providers/ChatProvider';

const QUICK_ACTIONS = [
  'Any laptops available?',
  'Show pending orders',
  "What's in stock?",
  'Dashboard stats',
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

/**
 * Sanitize and render HTML from the AI assistant.
 * Allows a safe subset of tags. Strips scripts, event handlers, and dangerous attributes.
 */
function renderMarkdown(content: string): string {
  // The AI now outputs HTML directly. We sanitize it to a safe allowlist.
  const allowedTags = new Set([
    'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'code', 'pre', 'blockquote',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'span', 'div',
  ]);

  // Strip script tags and their contents entirely
  let html = content.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Strip style tags
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Strip event handlers (onclick, onload, etc.)
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  // Strip javascript: hrefs
  html = html.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  html = html.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  // Remove any tags not in the allowlist
  html = html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    return allowedTags.has(tag.toLowerCase()) ? match : '';
  });

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

export function ChatPanel() {
  const {
    isPanelOpen,
    closePanel,
    messages,
    isSending,
    sendMessage,
    activeConversationId,
    createConversation,
    loadConversation,
  } = useChatContext();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isSending]);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isPanelOpen]);

  // Load active conversation when panel opens
  useEffect(() => {
    if (isPanelOpen && activeConversationId) {
      loadConversation(activeConversationId);
    }
  }, [isPanelOpen, activeConversationId, loadConversation]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await sendMessage(text);
  };

  const handleQuickAction = async (action: string) => {
    if (isSending) return;
    if (!activeConversationId) {
      await createConversation();
    }
    await sendMessage(action);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showWelcome = messages.length === 0 && !isSending;

  return (
    <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green/10">
              <Bot className="h-4 w-4 text-brand-green" />
            </div>
            <SheetTitle className="text-base">AI Assistant</SheetTitle>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closePanel}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto">
            {showWelcome && (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green/10">
                  <Sparkles className="h-7 w-7 text-brand-green" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  How can I help?
                </h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Ask me about inventory, orders, vendors, or asset management.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleQuickAction(action)}
                      className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand-green hover:text-brand-green"
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
                  className={`flex gap-3 px-4 py-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    className={`flex max-w-[80%] flex-col ${isUser ? 'items-end' : 'items-start'}`}
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
                          className="ai-message-content"
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
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about inventory..."
              rows={1}
              className="max-h-24 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
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
            AI responses may not always be accurate. Verify important data.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
