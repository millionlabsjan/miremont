import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";

const { width } = Dimensions.get("window");
const cardWidth = (width - 52) / 2;

export default function ActivityScreen() {
  const { data: favData } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => apiRequest("/api/properties/user/favorites"),
  });

  const { data: searchData } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => apiRequest("/api/searches"),
  });

  const favorites = Array.isArray(favData) ? favData : [];
  const searches = Array.isArray(searchData) ? searchData : [];

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
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.dark, marginTop: 4 }}>£ {Number(prop.price).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent activity */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 12 }}>Recent activity</Text>
        {[
          { text: 'New property matches your search "Waterfront Manhattan"', time: "2 hours ago" },
          { text: "Price drop on 432 Park Avenue, New York", time: "3 hours ago" },
          { text: "New message from agent Sarah Mitchell", time: "3 hours ago" },
          { text: "Viewing scheduled for tomorrow at 2:00 PM", time: "8 hours ago" },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dark, marginTop: 6 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>{item.text}</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{item.time}</Text>
            </View>
          </View>
        ))}

        {/* Saved searches */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 16, marginBottom: 12 }}>Saved searches</Text>
        {searches.length === 0 ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>No saved searches yet</Text>
        ) : (
          searches.map((s: any) => (
            <View key={s.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.dark }}>{s.name || "Untitled search"}</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.accent }}>View →</Text>
                </TouchableOpacity>
              </View>
              {s.filters && (
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {Object.entries(s.filters).filter(([_, v]) => v).map(([key, val]) => (
                    <View key={key} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>{String(val)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
