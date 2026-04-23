import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, Alert } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import MapView, { Marker, Callout } from "react-native-maps";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";
import { useAuthStore } from "../../lib/auth";

const { width, height } = Dimensions.get("window");
const CATEGORIES = ["All", "Villa", "Penthouse", "Estate", "Apartment", "Beachfront"];

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const mapRef = useRef<any>(null);
  const queryClient = useQueryClient();

  const toggleFavorite = async (propertyId: string) => {
    try {
      await apiRequest(`/api/properties/${propertyId}/favorite`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["properties-explore"] });
      queryClient.invalidateQueries({ queryKey: ["properties-home"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } catch {}
  };

  const { data } = useQuery({
    queryKey: ["properties-explore", search],
    queryFn: () => apiRequest(`/api/properties?q=${search}&limit=20`),
  });

  const properties = data?.properties || [];

  if (showMap) {
    return (
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.offwhite, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>← List view</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark }}>Explore</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: activeCategory === cat ? colors.dark : colors.offwhite, borderWidth: 1, borderColor: activeCategory === cat ? colors.dark : colors.border }}>
                <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: activeCategory === cat ? colors.offwhite : colors.warm }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{ latitude: 43, longitude: 2, latitudeDelta: 30, longitudeDelta: 30 }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {properties.map((prop: any) => {
            if (!prop.latitude || !prop.longitude) return null;
            const lat = parseFloat(prop.latitude);
            const lng = parseFloat(prop.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker key={prop.id} coordinate={{ latitude: lat, longitude: lng }} onCalloutPress={() => router.push(`/property/${prop.id}`)}>
                <View style={{ backgroundColor: colors.dark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: colors.offwhite }}>
                    £{(Number(prop.price) / 1_000_000).toFixed(1)}M
                  </Text>
                </View>
                <Callout>
                  <View style={{ width: 200 }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13 }}>{prop.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.warm }}>{prop.city}, {prop.country}</Text>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 4 }}>£ {Number(prop.price).toLocaleString()}</Text>
                    <Text style={{ fontSize: 11, color: "#2563eb", marginTop: 4 }}>View property →</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Locate me button */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert("Permission denied", "Allow location access to center the map on your position.");
                return;
              }
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              mapRef.current?.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 1000);
            } catch {
              Alert.alert("Error", "Could not get your location.");
            }
          }}
          style={{ position: "absolute", bottom: 160, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}
        >
          <Feather name="crosshair" size={20} color={colors.dark} />
        </TouchableOpacity>

        {/* Bottom property count */}
        <View style={{ position: "absolute", bottom: 100, alignSelf: "center", backgroundColor: colors.dark, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.offwhite }}>{properties.length} properties in this area</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, color: colors.dark }}>Explore</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <TouchableOpacity><Feather name="sliders" size={20} color={colors.dark} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMap(true)}><Feather name="map-pin" size={20} color={colors.dark} /></TouchableOpacity>
          </View>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search location, property type..."
          placeholderTextColor={colors.warm}
          style={{ height: 44, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 40, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}
        />
        <View style={{ position: "absolute", left: 32, bottom: 20 }}><Feather name="search" size={16} color={colors.warm} /></View>
      </View>

      {/* Property list */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {properties.map((prop: any) => (
          <TouchableOpacity
            key={prop.id}
            onPress={() => router.push(`/property/${prop.id}`)}
            style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
          >
            <View style={{ height: 220 }}>
              <Image source={{ uri: prop.images?.[0] || "https://via.placeholder.com/400x220" }} style={{ width: "100%", height: "100%" }} />
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); toggleFavorite(prop.id); }}
                style={{ position: "absolute", top: 14, right: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.95)", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
              >
                <Ionicons name={prop.isFavorited ? "heart" : "heart-outline"} size={24} color={colors.dark} />
              </TouchableOpacity>
              {prop.categories?.[0] && (
                <View style={{ position: "absolute", bottom: 12, left: 12, backgroundColor: colors.dark, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.offwhite, textTransform: "uppercase" }}>{prop.categories[0]}</Text>
                </View>
              )}
            </View>
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>{prop.title}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 2 }}>📍 {prop.city}, {prop.country}</Text>
                </View>
                <TouchableOpacity style={{ paddingLeft: 8, paddingTop: 2 }}>
                  <Feather name="bookmark" size={20} color={colors.warm} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: colors.dark, marginTop: 8 }}>
                £ {Number(prop.price).toLocaleString()}
              </Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 8, alignItems: "center" }}>
                {prop.bedrooms != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="grid" size={14} color={colors.warm} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{prop.bedrooms}</Text>
                  </View>
                )}
                {prop.bathrooms != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="droplet" size={14} color={colors.warm} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{prop.bathrooms}</Text>
                  </View>
                )}
                {prop.size && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Feather name="maximize" size={14} color={colors.warm} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{prop.size} sqm</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginTop: 6 }}>
                Updated {Math.max(0, Math.floor((Date.now() - new Date(prop.lastUpdated || prop.createdAt).getTime()) / (1000 * 60 * 60 * 24)))} days ago
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginTop: 2 }}>Listed by: {prop.agentName}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
