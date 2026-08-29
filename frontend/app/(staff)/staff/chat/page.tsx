"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Search, Loader2, MessageSquarePlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { chatService, ApiError } from "@/services";
import { useAuth } from "@/lib/auth-context";
import { getInitials, cn } from "@/lib/utils";
import type { ChatMessage, ChatThread } from "@/types";

type Thread = ChatThread & { clientId?: string; staffId?: string };

export default function StaffChatPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendBusy, setSendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const items = (await chatService.listThreads("staff")) as Thread[];
      setThreads(items);
      if (items.length > 0 && !activeThread) setActiveThread(items[0].id);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [activeThread]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!user) return;
      try {
        const msgs = await chatService.listMessages(threadId, user.businessId);
        setMessages(msgs);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load messages");
      }
    },
    [user],
  );

  useEffect(() => {
    void loadThreads();
    const interval = setInterval(loadThreads, 15_000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    if (!activeThread) return;
    void loadMessages(activeThread);
    const interval = setInterval(() => loadMessages(activeThread), 8_000);
    return () => clearInterval(interval);
  }, [activeThread, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const active = threads.find((t) => t.id === activeThread) ?? null;

  const sendMessage = async () => {
    if (!draft.trim() || !activeThread || !user) return;
    setSendBusy(true);
    try {
      const msg = await chatService.sendMessage(activeThread, draft.trim(), user.businessId);
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      await loadThreads();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to send message");
    } finally {
      setSendBusy(false);
    }
  };

  const filtered = threads.filter((t) =>
    t.clientName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="Chat" description="Message clients directly about their applications." />
      <Card
        className="grid grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]"
        style={{ height: "min(640px, 70vh)" }}
      >
        <div className="flex flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="p-4 text-center text-xs text-destructive">{error}</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-muted-foreground">
                <MessageSquarePlus className="h-6 w-6" />
                No conversations yet. Start one from an assigned client&apos;s row.
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveThread(t.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-secondary/60",
                    activeThread === t.id && "bg-primary-50/70",
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{getInitials(t.clientName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{t.clientName}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{t.time}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{t.lastMessage}</p>
                  </div>
                  {t.unread > 0 && (
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {t.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col">
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{getInitials(active.clientName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{active.clientName}</p>
                  <p className="text-xs text-muted-foreground">Client conversation</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin bg-secondary/20 p-4">
                {messages.length === 0 ? (
                  <p className="py-16 text-center text-xs text-muted-foreground">
                    No messages yet. Say hello!
                  </p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.isOwn ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-soft",
                          m.isOwn
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-card",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            m.isOwn ? "text-primary-100" : "text-muted-foreground",
                          )}
                        >
                          {m.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={sendBusy}
                />
                <Button
                  size="icon"
                  onClick={() => void sendMessage()}
                  aria-label="Send message"
                  disabled={sendBusy || !draft.trim()}
                >
                  {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
