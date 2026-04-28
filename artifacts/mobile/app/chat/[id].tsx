import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { useAuthStore } from "../../lib/auth";
import { colors, WS_URL } from "../../constants/theme";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => apiRequest(`/api/inquiries/${id}/messages`),
    refetchInterval: 5000,
  });

  // Fetch inquiry details for property context bar
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiRequest("/api/inquiries"),
  });
  const convo = Array.isArray(conversations) ? conversations.find((c: any) => c.id === id) : null;

  const msgs = Array.isArray(messages) ? messages : [];

  // Mark unread messages as read
  const markRead = useCallback(async (msgList: any[]) => {
    if (!user) return;
    const unreadIds = msgList
      .filter((m: any) => m.senderId !== user.id)
      .map((m: any) => m.id);
    if (unreadIds.length === 0) return;

    // Optimistic: invalidate conversations immediately for badge update
    try {
      await apiRequest("/api/inquiries/messages/mark-read", {
        method: "POST",
        body: JSON.stringify({ messageIds: unreadIds }),
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Also notify via WebSocket for instant feedback to other party
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "mark_read",
          inquiryId: id,
          messageIds: unreadIds,
        }));
      }
    } catch {}
  }, [user, id, queryClient]);

  // Mark read when messages load or update
  useEffect(() => {
    if (msgs.length > 0) {
      markRead(msgs);
    }
  }, [msgs.length]);

  // WebSocket connection
  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", userId: user.id }));
      ws.send(JSON.stringify({ type: "join_inquiry", inquiryId: id }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_message") {
          queryClient.invalidateQueries({ queryKey: ["messages", id] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
        if (data.type === "messages_read") {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      } catch {}
    };
    return () => ws.close();
  }, [user, id]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "send_message", inquiryId: id, content: messageText }));
    } else {
      await apiRequest(`/api/inquiries/${id}/messages`, { method: "POST", body: JSON.stringify({ content: messageText }) });
    }
    setMessageText("");
    queryClient.invalidateQueries({ queryKey: ["messages", id] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.offwhite }}>
      {/* Header */}
      <View style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.dark} />
          </TouchableOpacity>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.input, overflow: "hidden" }}>
            {convo?.otherUser?.avatarUrl && <Image source={{ uri: convo.otherUser.avatarUrl }} style={{ width: 40, height: 40 }} />}
          </View>
          <View>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.dark }}>
              {convo?.otherUser?.agencyName || convo?.otherUser?.name || "Conversation"}
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.green }}>Online</Text>
          </View>
        </View>

        {/* Property context bar */}
        {convo?.property && (
          <TouchableOpacity
            onPress={() => router.push(`/property/${convo.propertyId}` as any)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.input, borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <View style={{ width: 40, height: 32, borderRadius: 6, backgroundColor: colors.border, overflow: "hidden" }}>
              {convo.property.images?.[0] && <Image source={{ uri: convo.property.images[0] }} style={{ width: 40, height: 32 }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }} numberOfLines={1}>{convo.property.title}</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>€ {Number(convo.property.price || 0).toLocaleString()}</Text>
            </View>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>View ›</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={msgs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id;
          return (
            <View style={{ alignItems: isMine ? "flex-end" : "flex-start" }}>
              <View style={{
                maxWidth: "80%",
                backgroundColor: isMine ? colors.dark : colors.input,
                borderRadius: 16,
                borderBottomRightRadius: isMine ? 4 : 16,
                borderBottomLeftRadius: isMine ? 16 : 4,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: isMine ? colors.offwhite : colors.dark, lineHeight: 20 }}>{item.content}</Text>
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: colors.warm, marginTop: 4 }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 36, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity><Feather name="paperclip" size={20} color={colors.warm} /></TouchableOpacity>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor={colors.warm}
          style={{ flex: 1, height: 40, backgroundColor: colors.offwhite, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={sendMessage} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}>
          <Feather name="send" size={16} color={colors.offwhite} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
