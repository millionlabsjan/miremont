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
  createdAt: string;
  isRead: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  // Join inquiry when selected
  useEffect(() => {
    if (activeConvo && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: "join_inquiry", inquiryId: activeConvo })
      );
    }
  }, [activeConvo]);

  const sendMessage = async () => {
    if (!messageText.trim() || !activeConvo) return;

    // Send via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "send_message",
          inquiryId: activeConvo,
          content: messageText,
        })
      );
    } else {
      // Fallback to REST
      await apiRequest(`/api/inquiries/${activeConvo}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: messageText }),
      });
    }

    setMessageText("");
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
                <p className="text-xs text-green-600">Online</p>
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
              <div className="flex items-center gap-3">
                <button className="text-brand-warm hover:text-brand-dark">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 h-10 px-4 bg-brand-offwhite border border-brand-border rounded-full text-sm placeholder:text-brand-warm focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
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
