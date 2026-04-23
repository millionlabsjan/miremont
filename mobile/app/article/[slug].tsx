import { View, Text, ScrollView, TouchableOpacity, Image, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();

  const { data: article } = useQuery({
    queryKey: ["article", slug],
    queryFn: () => apiRequest(`/api/articles/by-slug/${slug}`),
  });

  if (!article) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.offwhite }}><Text style={{ color: colors.warm }}>Loading...</Text></View>;
  }

  // Strip HTML for simple rendering
  const bodyText = (article.content?.bodyEn || "").replace(/<[^>]+>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ position: "absolute", top: 48, left: 16, zIndex: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center" }}>
          <Feather name="arrow-left" size={20} color={colors.dark} />
        </TouchableOpacity>
      </View>

      {/* Hero image */}
      {article.thumbnailUrl && (
        <Image source={{ uri: article.thumbnailUrl }} style={{ width, height: 250 }} />
      )}

      <View style={{ padding: 20 }}>
        {/* Category badge */}
        {article.category && (
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 12 }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.warm, textTransform: "uppercase" }}>{article.category}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, lineHeight: 34, marginBottom: 16 }}>
          {article.content?.titleEn || "Untitled"}
        </Text>

        {/* Author */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 20 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.input }} />
          <View>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>By {article.author?.name || "Unknown"}</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>
              {article.publishedDate ? new Date(article.publishedDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }) : ""}
            </Text>
          </View>
        </View>

        {/* Body */}
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 16, color: colors.dark, lineHeight: 26 }}>{bodyText}</Text>

        {/* More articles */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: colors.dark, marginTop: 32, marginBottom: 16 }}>More articles</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>Visit the Articles section for more luxury property insights.</Text>
        <TouchableOpacity onPress={() => router.push("/articles" as any)} style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>View all articles →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
