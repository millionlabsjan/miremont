import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { useAuthStore } from "../../lib/auth";
import { colors } from "../../constants/theme";
import { formatPrice } from "../../lib/formatPrice";
import { useRates } from "../../lib/useRates";
import { notificationRoute } from "../../lib/notificationRoute";
import { summarizeFilters, typedSavedToFilterState } from "@workspace/filters";
import { useFilterStore } from "../../lib/filterStore";

const COLLAPSED_COUNT = 5;

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const { width } = Dimensions.get("window");
const cardWidth = (width - 52) / 2;

export default function ActivityScreen() {
  const userCurrency = useAuthStore((s) => s.user?.preferredCurrency);
  const rates = useRates();
  const { data: favData } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiRequest("/api/properties/user/favorites"),
  });

  const { data: searchData } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => apiRequest("/api/searches"),
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest("/api/notifications?limit=50"),
  });

  const queryClient = useQueryClient();
  const favorites = Array.isArray(favData) ? favData : [];
  const searches = Array.isArray(searchData) ? searchData : [];
  const recentActivity = notifData?.notifications ?? [];
  const unreadCount = notifData?.unread ?? 0;
  const [expanded, setExpanded] = useState(false);
  const visibleActivity = expanded ? recentActivity : recentActivity.slice(0, COLLAPSED_COUNT);
  const hiddenCount = recentActivity.length - COLLAPSED_COUNT;

  const markAsRead = async (id: string) => {
    await apiRequest(`/api/notifications/${id}/read`, { method: "PUT" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  };

  const markAllRead = async () => {
    await apiRequest("/api/notifications/read-all", { method: "PUT" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
  };

  const openNotification = (item: any) => {
    if (!item.isRead) void markAsRead(item.id);
    const route = notificationRoute(item.link);
    if (route) router.push(route as any);
  };

  const replaceFilters = useFilterStore((s) => s.replaceFilters);
  const handleViewSearch = (rawFilters: any) => {
    try {
      replaceFilters(typedSavedToFilterState(rawFilters));
      router.push("/(tabs)/explore");
    } catch {
      // Malformed legacy entry — skip
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, textAlign: "center", marginBottom: 20 }}>Activity</Text>

        {/* Stat cards */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, backgroundColor: colors.white }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase", letterSpacing: 1 }}>Saved Properties</Text>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, color: colors.dark, marginTop: 4 }}>{favorites.length}</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, backgroundColor: colors.white }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase", letterSpacing: 1 }}>Saved Searches</Text>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, color: colors.dark, marginTop: 4 }}>{searches.length}</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, backgroundColor: colors.white }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase", letterSpacing: 1 }}>Unread</Text>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, color: colors.dark, marginTop: 4 }}>{unreadCount}</Text>
          </View>
        </View>

        {/* Saved properties grid */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{favorites.length} saved properties</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Text style={{ fontSize: 16, color: colors.dark }}>⊞</Text>
            <Text style={{ fontSize: 16, color: colors.warm }}>☰</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
          {favorites.slice(0, 4).map((prop: any) => (
            <TouchableOpacity key={prop.id} onPress={() => router.push(`/property/${prop.id}`)} style={{ width: cardWidth, borderRadius: 12, overflow: "hidden", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
              <Image source={{ uri: prop.images?.[0] || "https://via.placeholder.com/200" }} style={{ width: "100%", height: 120 }} />
              {prop.categories?.[0] && (
                <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: colors.dark, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 9, color: colors.offwhite, textTransform: "uppercase" }}>{prop.categories?.[0]}</Text>
                </View>
              )}
              <View style={{ padding: 10 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.dark }} numberOfLines={1}>{prop.title}</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>📍 {prop.city}, {prop.country}</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.dark, marginTop: 4 }}>{formatPrice(prop.price, prop.currency, userCurrency, rates)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent activity */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark }}>Recent activity</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.accent }}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        {recentActivity.length === 0 ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>No recent activity</Text>
        ) : (
          <>
            {visibleActivity.map((item: any) => (
              <TouchableOpacity key={item.id} onPress={() => openNotification(item)} style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.isRead ? colors.warm : colors.accent, marginTop: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: item.isRead ? "Inter_400Regular" : "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>{item.title}</Text>
                  {item.body && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 1 }}>{item.body}</Text>}
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{timeAgo(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {hiddenCount > 0 && (
              <TouchableOpacity
                onPress={() => setExpanded((v) => !v)}
                style={{ alignSelf: "flex-start", paddingVertical: 4, marginTop: 4 }}
              >
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.accent }}>
                  {expanded ? "Show less" : `Show ${hiddenCount} more`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Saved searches */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 16, marginBottom: 12 }}>Saved searches</Text>
        {searches.length === 0 ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>No saved searches yet</Text>
        ) : (
          searches.map((s: any) => {
            let tags: string[] = [];
            try {
              tags = summarizeFilters(typedSavedToFilterState(s.filters));
            } catch {
              tags = [];
            }
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => handleViewSearch(s.filters)}
                activeOpacity={0.7}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.dark, flex: 1 }} numberOfLines={1}>{s.name || "Untitled search"}</Text>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.accent }}>View →</Text>
                </View>
                {tags.length > 0 ? (
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {tags.slice(0, 5).map((tag, i) => (
                      <View key={`${s.id}-tag-${i}`} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.input }}>
                        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.dark }}>{tag}</Text>
                      </View>
                    ))}
                    {tags.length > 5 && (
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.warm, paddingVertical: 4 }}>+{tags.length - 5} more</Text>
                    )}
                  </View>
                ) : (
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 6 }}>No filters set</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
