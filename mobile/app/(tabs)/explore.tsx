import { useState, useRef, useCallback, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, Alert, FlatList } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import MapView, { Marker, type Region } from "react-native-maps";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";
import { useAuthStore } from "../../lib/auth";

const { width } = Dimensions.get("window");
const ARROW_WIDTH = 28;
const SHEET_PADDING = 8;
const CARD_LIST_WIDTH = width - (ARROW_WIDTH + SHEET_PADDING) * 2;
const CATEGORIES = ["All", "Villa", "Penthouse", "Estate", "Apartment", "Beachfront"];

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const mapRef = useRef<any>(null);
  const cardListRef = useRef<FlatList>(null);
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

  const visibleProperties = useMemo(() => {
    if (!mapRegion) return properties.filter((p: any) => p.latitude && p.longitude);
    const { latitude, longitude, latitudeDelta, longitudeDelta } = mapRegion;
    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;
    return properties.filter((p: any) => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      if (isNaN(lat) || isNaN(lng)) return false;
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });
  }, [properties, mapRegion]);

  const onRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
    setActiveCardIndex(0);
    cardListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const onMarkerPress = useCallback((propId: string) => {
    const idx = visibleProperties.findIndex((p: any) => p.id === propId);
    if (idx >= 0) {
      setActiveCardIndex(idx);
      cardListRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  }, [visibleProperties]);

  const onCardScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_LIST_WIDTH);
    if (idx >= 0 && idx < visibleProperties.length) {
      setActiveCardIndex(idx);
    }
  }, [visibleProperties.length]);

  const scrollToCard = useCallback((direction: number) => {
    const next = activeCardIndex + direction;
    if (next >= 0 && next < visibleProperties.length) {
      setActiveCardIndex(next);
      cardListRef.current?.scrollToIndex({ index: next, animated: true });
    }
  }, [activeCardIndex, visibleProperties.length]);

  if (showMap) {
    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{ latitude: 43, longitude: 2, latitudeDelta: 30, longitudeDelta: 30 }}
          showsUserLocation
          showsMyLocationButton={false}
          onRegionChangeComplete={onRegionChange}
        >
          {properties.map((prop: any) => {
            if (!prop.latitude || !prop.longitude) return null;
            const lat = parseFloat(prop.latitude);
            const lng = parseFloat(prop.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            const isActive = visibleProperties[activeCardIndex]?.id === prop.id;
            return (
              <Marker key={prop.id} coordinate={{ latitude: lat, longitude: lng }} onPress={() => onMarkerPress(prop.id)}>
                <View style={{ backgroundColor: isActive ? "#c9a96e" : colors.dark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: colors.offwhite }}>
                    £{(Number(prop.price) / 1_000_000).toFixed(1)}M
                  </Text>
                </View>
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
          style={{ position: "absolute", top: 60, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}
        >
          <Feather name="crosshair" size={20} color={colors.dark} />
        </TouchableOpacity>

        {/* Property count pill */}
        <View style={{ position: "absolute", top: 60, alignSelf: "center", backgroundColor: colors.dark, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.offwhite }}>{visibleProperties.length} properties in this area</Text>
        </View>

        {/* Back to list */}
        <TouchableOpacity
          onPress={() => setShowMap(false)}
          style={{ position: "absolute", top: 60, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}
        >
          <Feather name="list" size={20} color={colors.dark} />
        </TouchableOpacity>

        {/* Bottom sheet */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.offwhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 10 }}>
          {/* Drag handle */}
          <View style={{ alignItems: "center", paddingVertical: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {visibleProperties.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: SHEET_PADDING }}>
              {/* Left arrow */}
              <TouchableOpacity
                onPress={() => scrollToCard(-1)}
                style={{ width: ARROW_WIDTH, alignItems: "center", opacity: activeCardIndex > 0 ? 1 : 0 }}
                disabled={activeCardIndex <= 0}
              >
                <Feather name="chevron-left" size={20} color={colors.warm} />
              </TouchableOpacity>

              {/* Card carousel */}
              <FlatList
                ref={cardListRef}
                data={visibleProperties}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onCardScroll}
                style={{ width: CARD_LIST_WIDTH }}
                getItemLayout={(_, index) => ({ length: CARD_LIST_WIDTH, offset: CARD_LIST_WIDTH * index, index })}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item: prop }: any) => (
                  <TouchableOpacity
                    onPress={() => router.push(`/property/${prop.id}`)}
                    activeOpacity={0.9}
                    style={{ width: CARD_LIST_WIDTH, flexDirection: "row", gap: 14, paddingVertical: 4 }}
                  >
                    <Image
                      source={{ uri: prop.images?.[0] || "https://via.placeholder.com/120" }}
                      style={{ width: 110, height: 130, borderRadius: 10 }}
                    />
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      {prop.categories?.[0] && (
                        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{prop.categories[0]}</Text>
                      )}
                      <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, color: colors.dark }} numberOfLines={1}>{prop.title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                        <Feather name="map-pin" size={12} color={colors.warm} />
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>{prop.city}, {prop.country}</Text>
                      </View>
                      <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: colors.dark, marginTop: 6 }}>
                        £{Number(prop.price).toLocaleString()}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 6, alignItems: "center" }}>
                        {prop.bedrooms != null && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Feather name="grid" size={12} color={colors.warm} />
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>{prop.bedrooms}</Text>
                          </View>
                        )}
                        {prop.bathrooms != null && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Feather name="droplet" size={12} color={colors.warm} />
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>{prop.bathrooms}</Text>
                          </View>
                        )}
                        {prop.size && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Feather name="maximize" size={12} color={colors.warm} />
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>{prop.size}m²</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => router.push(`/property/${prop.id}`)} style={{ marginTop: 8 }}>
                        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.dark }}>View property →</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )}
              />

              {/* Right arrow */}
              <TouchableOpacity
                onPress={() => scrollToCard(1)}
                style={{ width: ARROW_WIDTH, alignItems: "center", opacity: activeCardIndex < visibleProperties.length - 1 ? 1 : 0 }}
                disabled={activeCardIndex >= visibleProperties.length - 1}
              >
                <Feather name="chevron-right" size={20} color={colors.warm} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>No properties in this area</Text>
            </View>
          )}
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
            <TouchableOpacity><Feather name="align-center" size={20} color={colors.dark} /></TouchableOpacity>
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
            </View>
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>{prop.title}</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 2 }}>📍 {prop.city}, {prop.country}</Text>
                </View>
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
