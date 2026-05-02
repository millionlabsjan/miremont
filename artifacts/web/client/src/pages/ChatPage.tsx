import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Send, Paperclip } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { apiRequest } from "../lib/queryClient";
import { format } from "date-fns";
import { clsx } from "clsx";

interface Conversation {
  id: string;
  property: { title: string; images: string[] };
  otherUser: { id: string; name: string; avatarUrl: string | null; agencyName: string | null };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  inquiryId: string;
  senderId: string;
  content: string;
  attachments?: string[] | null;
  createdAt: string;
  isRead: boolean;
  isReadByMe?: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const onFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const room = 5 - pendingFiles.length;
    const accepted = files.slice(0, room).filter((f) => f.type.startsWith("image/"));
    setPendingFiles((prev) => [...prev, ...accepted]);
    setPendingPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
    e.target.value = ""; // allow re-selecting the same file
  };

  const removePendingFile = (idx: number) => {
    URL.revokeObjectURL(pendingPreviews[idx]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Connect WebSocket
  useEffect(() => {
    if (!user) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", userId: user.id }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_message") {
        queryClient.invalidateQueries({ queryKey: ["messages", data.message.inquiryId] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    };

    return () => ws.close();
  }, [user]);

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/inquiries", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch messages for active conversation
  const { data: messages } = useQuery({
    queryKey: ["messages", activeConvo],
    queryFn: async () => {
      if (!activeConvo) return [];
      const res = await fetch(`/api/inquiries/${activeConvo}/messages`, {
        credentials: "include",
      });
      return res.json();
    },
    enabled: !!activeConvo,
    refetchInterval: 5000,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Join inquiry when selected. Also clear the chat-list badge optimistically so
  // the unread pip disappears the instant the user clicks in.
  useEffect(() => {
    if (!activeConvo) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "join_inquiry", inquiryId: activeConvo })
      );
    }
    queryClient.setQueryData<Conversation[] | undefined>(["conversations"], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((c) => (c.id === activeConvo ? { ...c, unreadCount: 0 } : c));
    });
  }, [activeConvo, queryClient]);

  // Mark unread messages from the other party as read whenever the visible list
  // changes. Server is idempotent (onConflictDoNothing), so re-sending is safe.
  useEffect(() => {
    if (!activeConvo || !user || !Array.isArray(messages)) return;
    const unreadIds = (messages as Message[])
      .filter((m) => m.senderId !== user.id && m.isReadByMe === false)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    apiRequest("/api/inquiries/messages/mark-read", {
      method: "POST",
      body: JSON.stringify({ messageIds: unreadIds }),
    }).catch(() => {});
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "mark_read", inquiryId: activeConvo, messageIds: unreadIds })
      );
    }
  }, [messages, activeConvo, user]);

  const sendMessage = async () => {
    const trimmed = messageText.trim();
    if (!activeConvo) return;
    if (!trimmed && pendingFiles.length === 0) return;
    if (isUploading) return;

    let attachments: string[] = [];
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        pendingFiles.forEach((f) => formData.append("files", f));
        const res = await fetch(`/api/inquiries/${activeConvo}/attachments`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Upload failed");
        }
        const json = await res.json();
        attachments = json.urls || [];
      } catch (err: any) {
        alert(err.message || "Upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const payload: any = { content: trimmed, ...(attachments.length ? { attachments } : {}) };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "send_message", inquiryId: activeConvo, ...payload })
      );
    } else {
      await apiRequest(`/api/inquiries/${activeConvo}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    setMessageText("");
    pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    setPendingFiles([]);
    setPendingPreviews([]);
    queryClient.invalidateQueries({ queryKey: ["messages", activeConvo] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  const activeConversation = conversations?.find(
    (c: Conversation) => c.id === activeConvo
  );

  return (
    <div className="flex h-screen">
      {/* Left: Conversation List */}
      <div className="w-[360px] border-r border-brand-border flex flex-col bg-white shrink-0">
        <div className="p-5 border-b border-brand-border">
          <h1 className="font-serif text-2xl font-bold text-brand-dark mb-4">
            Messages
          </h1>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-warm"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations"
              className="w-full h-10 pl-9 pr-4 bg-brand-offwhite border border-brand-border rounded-lg text-sm placeholder:text-brand-warm focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations?.length === 0 && (
            <p className="text-sm text-brand-warm text-center py-8">
              No conversations yet
            </p>
          )}
          {conversations?.map((convo: Conversation) => (
            <button
              key={convo.id}
              onClick={() => setActiveConvo(convo.id)}
              className={clsx(
                "w-full p-4 flex gap-3 text-left border-b border-brand-border/50 hover:bg-brand-offwhite transition-colors",
                activeConvo === convo.id && "bg-brand-offwhite"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-brand-input shrink-0 overflow-hidden">
                {convo.otherUser.avatarUrl && (
                  <img
                    src={convo.otherUser.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-brand-dark truncate">
                    {convo.otherUser.agencyName || convo.otherUser.name}
                  </p>
                  {convo.unreadCount > 0 && (
                    <span className="bg-brand-dark text-brand-offwhite text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-warm truncate">
                  {convo.property?.title}
                </p>
                <p className="text-xs text-brand-warm truncate mt-0.5">
                  {convo.lastMessage?.content || "No messages yet"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Message Thread */}
      <div className="flex-1 flex flex-col bg-brand-offwhite">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-brand-border bg-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-input overflow-hidden">
                {activeConversation.otherUser.avatarUrl && (
                  <img
                    src={activeConversation.otherUser.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {activeConversation.otherUser.agencyName ||
                    activeConversation.otherUser.name}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(messages || []).map((msg: Message) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={clsx("flex flex-col", isMine ? "items-end" : "items-start")}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className={clsx("flex flex-wrap gap-1 max-w-[70%] mb-1", isMine ? "justify-end" : "justify-start")}>
                        {msg.attachments.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt=""
                              className="w-48 h-48 object-cover rounded-2xl bg-brand-input"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.content && (
                      <div
                        className={clsx(
                          "max-w-[70%] rounded-2xl px-4 py-3 text-sm",
                          isMine
                            ? "bg-brand-dark text-brand-offwhite rounded-br-md"
                            : "bg-brand-input text-brand-dark rounded-bl-md"
                        )}
                      >
                        {msg.content}
                      </div>
                    )}
                    <p className="text-[10px] text-brand-warm mt-1">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="p-4 border-t border-brand-border bg-white">
              {pendingPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {pendingPreviews.map((src, i) => (
                    <div key={src} className="relative">
                      <img src={src} alt="" className="w-14 h-14 object-cover rounded-lg bg-brand-input" />
                      <button
                        onClick={() => removePendingFile(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-dark text-brand-offwhite rounded-full flex items-center justify-center text-xs"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={onFilesPicked}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || pendingFiles.length >= 5}
                  className="text-brand-warm hover:text-brand-dark disabled:opacity-40"
                  title="Attach image"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  disabled={isUploading}
                  className="flex-1 h-10 px-4 bg-brand-offwhite border border-brand-border rounded-full text-sm placeholder:text-brand-warm focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={isUploading || (!messageText.trim() && pendingFiles.length === 0)}
                  className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center text-brand-offwhite hover:bg-brand-dark/90 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-brand-warm">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
