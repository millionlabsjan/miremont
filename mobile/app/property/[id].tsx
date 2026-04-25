import { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, FlatList } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MapView, { Marker } from "react-native-maps";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";

const { width } = Dimensions.get("window");

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("description");
  const [activeImage, setActiveImage] = useState(0);
  const queryClient = useQueryClient();

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: () => apiRequest(`/api/properties/${id}`),
  });

  const toggleFavorite = async () => {
    try {
      await apiRequest(`/api/properties/${id}/favorite`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      queryClient.invalidateQueries({ queryKey: ["properties-home"] });
      queryClient.invalidateQueries({ queryKey: ["properties-explore"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {}
  };

  if (isLoading || !property) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.offwhite }}>
        <Text style={{ color: colors.warm }}>Loading...</Text>
      </View>
    );
  }

  const images = property.images || [];
  const tabs = ["Description", "Features", "Location"];

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image gallery */}
        <View style={{ height: 300 }}>
          <FlatList
            data={images.length > 0 ? images : ["https://via.placeholder.com/400x300"]}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width, height: 300 }} />
            )}
          />
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center" }}>
            <Feather name="arrow-left" size={20} color={colors.dark} />
          </TouchableOpacity>
          {/* Share + Favorite */}
          <View style={{ position: "absolute", top: 52, right: 16, flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center" }}>
              <Feather name="share-2" size={20} color={colors.dark} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center" }}>
              <Ionicons name={property.isFavorited ? "heart" : "heart-outline"} size={22} color={colors.dark} />
            </TouchableOpacity>
          </View>
          {/* Image counter */}
          {images.length > 1 && (
            <View style={{ position: "absolute", bottom: 12, right: 16, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.offwhite }}>{activeImage + 1} / {images.length}</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, lineHeight: 34 }}>{property.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
            <Feather name="map-pin" size={14} color={colors.warm} />
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>{property.address || `${property.city}, ${property.country}`}</Text>
          </View>

          {/* Price */}
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, color: colors.dark, marginTop: 16 }}>
            £ {Number(property.price).toLocaleString()}
          </Text>

          {/* Currency converter */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>Show in:</Text>
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>▾</Text>
            </View>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>£ {Number(property.price).toLocaleString()}</Text>
          </View>

          {/* Listed by */}
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 8 }}>
            Listed by: {property.agent?.agencyName || property.agent?.name || "Agent"}
          </Text>

          {/* Specs row — matching Figma: horizontal row with label on top, big value below */}
          <View style={{ flexDirection: "row", marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            {property.bedrooms != null && (
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Bedrooms</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.dark, marginTop: 4 }}>{property.bedrooms}</Text>
              </View>
            )}
            {property.bathrooms != null && (
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Bathrooms</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.dark, marginTop: 4 }}>{property.bathrooms}</Text>
              </View>
            )}
            {property.size && (
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Size</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.dark, marginTop: 4 }}>{property.size} m²</Text>
              </View>
            )}
            {property.yearBuilt && (
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Year built</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.dark, marginTop: 4 }}>{property.yearBuilt}</Text>
              </View>
            )}
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 24 }}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab.toLowerCase())} style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === tab.toLowerCase() ? colors.dark : "transparent" }}>
                <Text style={{ fontFamily: activeTab === tab.toLowerCase() ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 14, color: activeTab === tab.toLowerCase() ? colors.dark : colors.warm, textAlign: "center" }}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={{ marginTop: 16 }}>
            {activeTab === "description" && (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: colors.dark, lineHeight: 24 }}>{property.description || "No description available."}</Text>
            )}
            {activeTab === "features" && (
              <View style={{ gap: 8 }}>
                {(property.features || []).map((f: string, i: number) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.dark }} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
            {activeTab === "location" && property.latitude && property.longitude && (
              <View style={{ height: 250, borderRadius: 12, overflow: "hidden" }}>
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={{ latitude: parseFloat(property.latitude), longitude: parseFloat(property.longitude), latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                >
                  <Marker coordinate={{ latitude: parseFloat(property.latitude), longitude: parseFloat(property.longitude) }}>
                    <View style={{ backgroundColor: colors.dark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: colors.offwhite }}>£{(Number(property.price) / 1_000_000).toFixed(1)}M</Text>
                    </View>
                  </Marker>
                </MapView>
              </View>
            )}
          </View>

          {/* Agent info */}
          {property.agent && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.input }} />
              <View>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>Listed by: {property.agent.agencyName || property.agent.name}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 36, backgroundColor: colors.offwhite, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          onPress={() => router.push(`/chat/${id}?newInquiry=true&propertyId=${id}`)}
          style={{ flex: 1, height: 52, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.offwhite }}>Contact agent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ width: 52, height: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
          <Feather name="phone" size={20} color={colors.dark} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
