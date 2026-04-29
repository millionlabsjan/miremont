import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { apiRequest } from "../../lib/api";
import { useAuthStore } from "../../lib/auth";
import { colors } from "../../constants/theme";
import { formatPrice } from "../../lib/formatPrice";
import { useRates } from "../../lib/useRates";
import { useState } from "react";

export default function AgentListingsScreen() {
  const userCurrency = useAuthStore((s) => s.user?.preferredCurrency);
  const rates = useRates();
  const [filter, setFilter] = useState("All");

  const { data: listings } = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => apiRequest("/api/properties/user/my-listings"),
  });

  const props = Array.isArray(listings) ? listings : [];
  const active = props.filter((p: any) => p.status === "active");
  const hidden = props.filter((p: any) => p.status === "delisted" || p.status === "inactive");
  const drafts = props.filter((p: any) => p.status === "draft");

  const filtered = filter === "All" ? props : filter === "Active" ? active : hidden;

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, marginBottom: 16 }}>My Listing</Text>

        {/* Stat chips */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[
            { label: `${active.length} Active` },
            { label: `${hidden.length} Hidden` },
            { label: `${drafts.length} Draft` },
          ].map((s) => (
            <View key={s.label} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
          {["All", "Active", "Hidden"].map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: filter === f ? colors.dark : colors.offwhite, borderWidth: 1, borderColor: filter === f ? colors.dark : colors.border }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: filter === f ? colors.offwhite : colors.warm }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {filtered.map((prop: any) => (
          <TouchableOpacity key={prop.id} onPress={() => router.push(`/property/${prop.id}`)} style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
            <View style={{ height: 160, position: "relative" }}>
              <Image source={{ uri: prop.images?.[0] || "https://via.placeholder.com/400x160" }} style={{ width: "100%", height: "100%" }} />
              <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: prop.status === "active" ? colors.dark : colors.warm, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.offwhite, textTransform: "capitalize" }}>{prop.status === "delisted" ? "Hidden" : prop.status}</Text>
              </View>
              <TouchableOpacity style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.9)", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 14 }}>⋮</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 14 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>{prop.title}</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 2 }}>{prop.city}, {prop.country}</Text>
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 6 }}>{formatPrice(prop.price, prop.currency, userCurrency, rates)}</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                {prop.bedrooms && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>🛏 {prop.bedrooms}</Text>}
                {prop.bathrooms && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>🚿 {prop.bathrooms}</Text>}
                {prop.size && <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>📐 {prop.size} sqm</Text>}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.dark }}>{prop.status === "active" ? "Deactivate" : "Activate"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.dark }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
