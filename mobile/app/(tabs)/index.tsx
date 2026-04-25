import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Dimensions } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { useAuthStore } from "../../lib/auth";
import { colors } from "../../constants/theme";
import { Feather, Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CATEGORIES = ["All", "Villa", "Apartment", "Penthouse", "Beachfront", "Estates"];

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);

  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["properties-home"],
    queryFn: () => apiRequest("/api/properties?limit=6"),
  });

  const toggleFavorite = async (propertyId: string) => {
    try {
      await apiRequest(`/api/properties/${propertyId}/favorite`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["properties-home"] });
      queryClient.invalidateQueries({ queryKey: ["properties-explore"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {}
  };

  const { data: articlesData } = useQuery({
    queryKey: ["articles-home"],
    queryFn: () => apiRequest("/api/articles?limit=4"),
  });

  const displayName = user?.role === "agent"
    ? (user?.agencyName || user?.name?.split(" ")[0])
    : user?.name?.split(" ")[0];

  const articles = articlesData?.articles || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 16, color: colors.dark }}>
          Good morning, {displayName}
        </Text>
        <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center" }}>
          <Feather name="bell" size={18} color={colors.warm} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={{ position: "relative" }}>
          <TextInput
            placeholder="Search location, property type..."
            placeholderTextColor={colors.warm}
            style={{ height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingLeft: 40, paddingRight: 16, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}
            onFocus={() => router.push("/(tabs)/explore")}
          />
          <View style={{ position: "absolute", left: 14, top: 12 }}><Feather name="search" size={16} color={colors.warm} /></View>
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={cat}
            onPress={() => router.push("/(tabs)/explore")}
            style={{
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
              backgroundColor: i === 0 ? colors.dark : colors.offwhite,
              borderWidth: 1, borderColor: i === 0 ? colors.dark : colors.border,
            }}
          >
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: i === 0 ? colors.offwhite : colors.dark }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Property cards — full width vertical list */}
      <View style={{ paddingHorizontal: 20 }}>
        {(data?.properties || []).slice(0, 3).map((item: any) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => router.push(`/property/${item.id}`)}
            style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
          >
            <View style={{ height: 220, position: "relative" }}>
              <Image
                source={{ uri: item.images?.[0] || "https://via.placeholder.com/400x220" }}
                style={{ width: "100%", height: "100%" }}
              />
              {/* Favorite heart */}
              <TouchableOpacity
                onPress={() => toggleFavorite(item.id)}
                style={{ position: "absolute", top: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
              >
                <Ionicons name={item.isFavorited ? "heart" : "heart-outline"} size={24} color={colors.dark} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>{item.title}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 2 }}>📍 {item.city}, {item.country}</Text>
                </View>
                {/* Bookmark icon */}
                <TouchableOpacity style={{ paddingLeft: 8, paddingTop: 2 }}>
                  <Feather name="bookmark" size={20} color={colors.warm} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: colors.dark, marginTop: 8 }}>
                £ {Number(item.price).toLocaleString()}
              </Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 8, alignItems: "center" }}>
                {item.bedrooms != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="grid" size={14} color={colors.warm} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{item.bedrooms}</Text>
                  </View>
                )}
                {item.bathrooms != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="droplet" size={14} color={colors.warm} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{item.bathrooms}</Text>
                  </View>
                )}
                {item.size && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="maximize" size={14} color={colors.warm} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{item.size} sqm</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginTop: 6 }}>
                Updated {Math.floor((Date.now() - new Date(item.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))} days ago
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginTop: 2 }}>
                Listed by: {item.agentName || "Asset Properties"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* View All button */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/explore")}
        style={{ marginHorizontal: 20, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.dark, marginBottom: 32 }}
      >
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.offwhite }}>View All</Text>
      </TouchableOpacity>

      {/* Articles section */}
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: colors.dark }}>Articles</Text>
          <TouchableOpacity onPress={() => router.push("/articles" as any)}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.warm }}>View all</Text>
          </TouchableOpacity>
        </View>

        {articles.map((article: any) => (
          <TouchableOpacity
            key={article.id}
            onPress={() => router.push(`/article/${article.slug}`)}
            style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Image source={{ uri: article.thumbnailUrl || "https://via.placeholder.com/80" }} style={{ width: 70, height: 56, borderRadius: 8 }} />
            <View style={{ flex: 1 }}>
              {article.category && (
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.accent, textTransform: "uppercase", letterSpacing: 1 }}>{article.category}</Text>
              )}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark, marginTop: 2 }} numberOfLines={2}>
                {article.content?.titleEn || "Untitled"}
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 4 }}>
                {article.author?.name}{article.publishedDate ? ` · ${new Date(article.publishedDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
