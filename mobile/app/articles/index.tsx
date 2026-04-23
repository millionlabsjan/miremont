import { View, Text, ScrollView, TouchableOpacity, Image, TextInput } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";
import { useState } from "react";

export default function ArticlesListScreen() {
  const [category, setCategory] = useState("Featured");
  const categories = ["Featured", "Investment", "Design"];

  const { data } = useQuery({
    queryKey: ["articles"],
    queryFn: () => apiRequest("/api/articles"),
  });

  const articles = data?.articles || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 20, color: colors.dark }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: colors.dark }}>Articles</Text>
        </View>

        <TextInput placeholder="Search articles" placeholderTextColor={colors.warm} style={{ height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 40, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark, marginBottom: 12 }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat} onPress={() => setCategory(cat)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: category === cat ? colors.dark : colors.offwhite, borderWidth: 1, borderColor: category === cat ? colors.dark : colors.border }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: category === cat ? colors.offwhite : colors.warm }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {/* Hero article */}
        {articles[0] && (
          <TouchableOpacity onPress={() => router.push(`/article/${articles[0].slug}`)} style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
            <View style={{ height: 200, position: "relative" }}>
              {articles[0].thumbnailUrl && <Image source={{ uri: articles[0].thumbnailUrl }} style={{ width: "100%", height: "100%" }} />}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.4)" }}>
                <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.offwhite }}>{articles[0].content?.titleEn}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Article list */}
        {articles.slice(1).map((article: any) => (
          <TouchableOpacity key={article.id} onPress={() => router.push(`/article/${article.slug}`)} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Image source={{ uri: article.thumbnailUrl || "https://via.placeholder.com/80" }} style={{ width: 70, height: 56, borderRadius: 8 }} />
            <View style={{ flex: 1 }}>
              {article.category && <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.accent, textTransform: "uppercase", letterSpacing: 1 }}>{article.category}</Text>}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark, marginTop: 2 }} numberOfLines={2}>{article.content?.titleEn || "Untitled"}</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 4 }}>
                {article.author?.name}{article.publishedDate ? ` · ${new Date(article.publishedDate).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" })}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
