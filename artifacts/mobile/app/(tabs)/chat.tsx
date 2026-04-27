import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";

export default function ChatScreen() {
  const { data: conversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiRequest("/api/inquiries"),
    refetchInterval: 10000,
  });

  const convos = Array.isArray(conversations) ? conversations : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, marginBottom: 16 }}>Messages</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor={colors.warm}
            style={{ height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 40, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}
          />
          <Text style={{ position: "absolute", left: 12, top: 12, fontSize: 16, color: colors.warm }}>🔍</Text>
        </View>
      </View>

      <ScrollView>
        {convos.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: colors.warm, textAlign: "center" }}>No conversations yet.{"\n"}Contact an agent to start chatting.</Text>
          </View>
        ) : (
          convos.map((convo: any) => (
            <TouchableOpacity
              key={convo.id}
              onPress={() => router.push(`/chat/${convo.id}`)}
              style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.input, overflow: "hidden" }}>
                {convo.otherUser?.avatarUrl ? (
                  <Image source={{ uri: convo.otherUser.avatarUrl }} style={{ width: 48, height: 48 }} />
                ) : (
                  <View style={{ width: 48, height: 48, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>
                      {(convo.otherUser?.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.dark }}>
                    {convo.otherUser?.agencyName || convo.otherUser?.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>
                      {convo.lastMessage ? timeAgo(convo.lastMessage.createdAt) : ""}
                    </Text>
                    {convo.unreadCount > 0 && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: colors.offwhite }}>{convo.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{convo.property?.title}</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 4 }} numberOfLines={2}>
                  {convo.lastMessage?.content || "No messages yet"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
