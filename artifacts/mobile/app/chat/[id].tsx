import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, ActionSheetIOS, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { apiRequest, apiUpload } from "../../lib/api";
import { useAuthStore } from "../../lib/auth";
import { colors, WS_URL, API_URL } from "../../constants/theme";
import { formatPrice } from "../../lib/formatPrice";
import { useRates } from "../../lib/useRates";

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const rates = useRates();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [pendingImages, setPendingImages] = useState<{ uri: string; name: string; type: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const initialScrollDoneRef = useRef(false);
  const lastSeenMsgCountRef = useRef(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [unreadBelow, setUnreadBelow] = useState(0);

  const resolveAttachmentUrl = (url: string, cacheBuster?: string | number) => {
    // Rewrite /uploads/chat/* to /api/uploads/chat/* on mobile. Replit's edge
    // proxy detects iOS Expo CFNetwork user-agents and routes any non-/api path
    // to the mobile dev server, which serves an HTML SPA shell (~1435 bytes)
    // instead of the image. Hitting /api/* forces the proxy to route by URL
    // prefix and reach our Express server. Use split/join so we don't have to
    // escape regex metacharacters in API_URL.
    const rewritten = url.split("/uploads/chat/").join("/api/uploads/chat/");
    const absolute = rewritten.startsWith("http") ? rewritten : `${API_URL}${rewritten}`;
    if (!cacheBuster) return absolute;
    return absolute.includes("?") ? `${absolute}&v=${cacheBuster}` : `${absolute}?v=${cacheBuster}`;
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - pendingImages.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    addAssets(result.assets);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission needed", "Enable it in Settings to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;
    addAssets(result.assets);
  };

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    const EXT_TO_MIME: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      heic: "image/heic",
      heif: "image/heif",
    };
    const next = assets.slice(0, 5 - pendingImages.length).map((a) => {
      const rawName = a.fileName || a.uri.split("/").pop() || `image-${Date.now()}.jpg`;
      const ext = (rawName.split(".").pop() || "jpg").toLowerCase();
      // Prefer the picker's reported mime; fall back to extension lookup;
      // final fallback is JPEG (Expo's default after picker conversion).
      const type = a.mimeType || EXT_TO_MIME[ext] || "image/jpeg";
      // Make sure the filename's extension actually matches the mime type the
      // server is going to record — otherwise the bucket key gets the wrong
      // extension and Content-Type negotiation breaks on the way back out.
      const expectedExt = type === "image/jpeg" ? "jpg" : type.split("/")[1];
      const name = ext === expectedExt ? rawName : `${rawName.replace(/\.[^.]+$/, "")}.${expectedExt}`;
      return { uri: a.uri, name, type };
    });
    setPendingImages((prev) => [...prev, ...next]);
  };

  const removePendingImage = (uri: string) => {
    setPendingImages((prev) => prev.filter((p) => p.uri !== uri));
  };

  const onPaperclipPress = () => {
    if (pendingImages.length >= 5) {
      Alert.alert("Limit reached", "You can attach up to 5 images per message.");
      return;
    }
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Take photo", "Choose from library"], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) takePhoto();
          if (idx === 2) pickFromLibrary();
        }
      );
    } else {
      Alert.alert("Add image", "Choose source", [
        { text: "Take photo", onPress: takePhoto },
        { text: "Choose from library", onPress: pickFromLibrary },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

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
      .filter((m: any) => m.senderId !== user.id && m.isReadByMe === false)
      .map((m: any) => m.id);
    if (unreadIds.length === 0) return;

    try {
      await apiRequest("/api/inquiries/messages/mark-read", {
        method: "POST",
        body: JSON.stringify({ messageIds: unreadIds }),
      });

      // Notify the other party via WebSocket so their UI updates without polling.
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "mark_read",
          inquiryId: id,
          messageIds: unreadIds,
        }));
      }
    } catch {}
  }, [user, id]);

  // On entry: optimistically clear the chat-list badge for this thread so the
  // user sees the [N] disappear instantly when they tap in. The server PUT below
  // confirms the write; the next conversations refetch will agree.
  useEffect(() => {
    queryClient.setQueryData<any[] | undefined>(["conversations"], (old) => {
      if (!Array.isArray(old)) return old;
      return old.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c));
    });
  }, [id, queryClient]);

  // Mark read when messages load or new ones arrive.
  useEffect(() => {
    if (msgs.length > 0) markRead(msgs);
  }, [msgs.length, markRead]);

  // New-message handling: if the user is reading near the bottom, auto-scroll
  // them to the latest message (WhatsApp-style follow). If they've scrolled up,
  // don't yank them — increment the floating-button counter instead so they
  // can opt to jump back down.
  useEffect(() => {
    if (msgs.length === 0) return;
    if (!initialScrollDoneRef.current) {
      lastSeenMsgCountRef.current = msgs.length;
      return;
    }
    const newCount = msgs.length - lastSeenMsgCountRef.current;
    if (newCount > 0) {
      if (isNearBottom) {
        flatListRef.current?.scrollToEnd({ animated: true });
      } else {
        const newFromOthers = msgs
          .slice(-newCount)
          .filter((m: any) => m.senderId !== user?.id).length;
        if (newFromOthers > 0) setUnreadBelow((prev) => prev + newFromOthers);
      }
    }
    lastSeenMsgCountRef.current = msgs.length;
  }, [msgs.length, isNearBottom, user?.id]);

  const handleScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const near = distanceFromBottom < 80;
    setIsNearBottom(near);
    if (near) setUnreadBelow(0);
  }, []);

  const jumpToLatest = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setUnreadBelow(0);
  }, []);

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
    const trimmed = messageText.trim();
    if (!trimmed && pendingImages.length === 0) return;
    if (isUploading) return;

    let attachments: string[] = [];
    if (pendingImages.length > 0) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        pendingImages.forEach((img) => {
          formData.append("files", { uri: img.uri, name: img.name, type: img.type } as any);
        });
        const result = await apiUpload(`/api/inquiries/${id}/attachments`, formData);
        attachments = result?.urls || [];
      } catch (err: any) {
        Alert.alert("Upload failed", err?.message || "Could not upload images");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const payload = { content: trimmed, ...(attachments.length ? { attachments } : {}) };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "send_message", inquiryId: id, ...payload }));
    } else {
      await apiRequest(`/api/inquiries/${id}/messages`, { method: "POST", body: JSON.stringify(payload) });
    }
    setMessageText("");
    setPendingImages([]);
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
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>{formatPrice(convo.property.price || 0, convo.property.currency, user?.preferredCurrency, rates)}</Text>
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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          // First layout (and any subsequent reflow before the user has scrolled)
          // pins us at the bottom — the latest message is always in view. Once
          // the user has scrolled away, the message-count effect above takes over
          // and only re-scrolls on genuinely new arrivals.
          if (!initialScrollDoneRef.current) {
            flatListRef.current?.scrollToEnd({ animated: false });
            // Mark done on the *next* tick — this lets re-measures from images
            // that load shortly after mount also keep us pinned to the bottom,
            // instead of stranding the user mid-list.
            setTimeout(() => {
              initialScrollDoneRef.current = true;
            }, 600);
          }
        }}
        renderItem={({ item }) => {
          const isMine = item.senderId === user?.id;
          const hasAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
          const hasContent = !!item.content && item.content.length > 0;
          return (
            <View style={{ alignItems: isMine ? "flex-end" : "flex-start" }}>
              {hasAttachments && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, maxWidth: "80%", marginBottom: hasContent ? 4 : 0, justifyContent: isMine ? "flex-end" : "flex-start" }}>
                  {item.attachments.map((url: string, i: number) => {
                    const finalUri = resolveAttachmentUrl(url, item.id || item.createdAt);
                    return (
                      <Image
                        key={i}
                        source={{ uri: finalUri }}
                        style={{ width: 200, height: 200, borderRadius: 12, backgroundColor: colors.input }}
                        resizeMode="cover"
                        onError={(e) =>
                          console.warn("[chat] image load failed", finalUri, e?.nativeEvent?.error)
                        }
                      />
                    );
                  })}
                </View>
              )}
              {hasContent && (
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
              )}
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: colors.warm, marginTop: 4 }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        }}
      />

      {/* Jump-to-latest floating chip — only when scrolled up AND new messages
          arrived from the other party while you were reading history. */}
      {!isNearBottom && unreadBelow > 0 && (
        <TouchableOpacity
          onPress={jumpToLatest}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: 96,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingLeft: 12,
            paddingRight: 14,
            paddingVertical: 10,
            backgroundColor: colors.dark,
            borderRadius: 22,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Feather name="chevron-down" size={16} color={colors.offwhite} />
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.offwhite }}>
            {unreadBelow} new
          </Text>
        </TouchableOpacity>
      )}

      {/* Pending image previews */}
      {pendingImages.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 8, backgroundColor: colors.white }}>
          {pendingImages.map((img) => (
            <View key={img.uri} style={{ position: "relative" }}>
              <Image source={{ uri: img.uri }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.input }} />
              <TouchableOpacity
                onPress={() => removePendingImage(img.uri)}
                style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}
              >
                <Feather name="x" size={12} color={colors.offwhite} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 36, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity onPress={onPaperclipPress} disabled={isUploading}>
          <Feather name="paperclip" size={20} color={isUploading ? colors.border : colors.warm} />
        </TouchableOpacity>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor={colors.warm}
          style={{ flex: 1, height: 40, backgroundColor: colors.offwhite, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          editable={!isUploading}
        />
        <TouchableOpacity onPress={sendMessage} disabled={isUploading} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isUploading ? colors.warm : colors.dark, justifyContent: "center", alignItems: "center" }}>
          <Feather name={isUploading ? "loader" : "send"} size={16} color={colors.offwhite} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
