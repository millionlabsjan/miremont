import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  filterStateToTyped,
  typedSavedToFilterState,
  summarizeFilters,
  hasActiveFilters,
  type FilterState,
} from "@workspace/filters";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";

type SavedSearch = {
  id: string;
  name: string | null;
  filters: any;
  createdAt: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onLoad: (next: FilterState) => void;
};

export default function SavedSearchesSheet({
  visible,
  onClose,
  filters,
  onLoad,
}: Props) {
  const queryClient = useQueryClient();
  const { data: searches = [], isLoading } = useQuery<SavedSearch[]>({
    queryKey: ["saved-searches"],
    queryFn: () => apiRequest("/api/searches"),
    enabled: visible,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("/api/searches", {
        method: "POST",
        body: JSON.stringify({ name, filters: filterStateToTyped(filters) }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/searches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });

  const canSave = hasActiveFilters(filters);

  const promptName = (cb: (name: string) => void) => {
    if (Platform.OS === "ios") {
      Alert.prompt("Save search", "Name this search so you can find it later.", (name) => {
        if (name?.trim()) cb(name.trim());
      });
      return;
    }
    // Android fallback: use a default name based on the summary
    const auto = summarizeFilters(filters).slice(0, 2).join(" · ") || "Saved search";
    cb(auto);
  };

  const handleSave = () => {
    if (!canSave) return;
    promptName((name) => saveMutation.mutate(name));
  };

  const handleLoad = (s: SavedSearch) => {
    try {
      const next = typedSavedToFilterState(s.filters);
      onLoad(next);
      onClose();
    } catch {
      // Skip malformed legacy entries
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
        <View
          style={{
            paddingTop: Platform.OS === "ios" ? 16 : 40,
            paddingHorizontal: 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.white,
          }}
        >
          <Text
            style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: colors.dark }}
          >
            Saved searches
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }}>
          {isLoading ? (
            <Text
              style={{
                padding: 20,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.warm,
              }}
            >
              Loading…
            </Text>
          ) : searches.length === 0 ? (
            <Text
              style={{
                padding: 20,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.warm,
              }}
            >
              No saved searches yet. Set up filters and tap “Save current search” below.
            </Text>
          ) : (
            searches.map((s) => {
              let tags: string[] = [];
              try {
                tags = summarizeFilters(typedSavedToFilterState(s.filters));
              } catch {
                tags = [];
              }
              return (
                <View
                  key={s.id}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.white,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <TouchableOpacity onPress={() => handleLoad(s)} style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 14,
                          color: colors.dark,
                        }}
                      >
                        {s.name || "Untitled search"}
                      </Text>
                      {tags.length > 0 ? (
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginTop: 6,
                            gap: 4,
                          }}
                        >
                          {tags.slice(0, 5).map((tag, i) => (
                            <View
                              key={`${s.id}-tag-${i}`}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 10,
                                backgroundColor: colors.input,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter_500Medium",
                                  fontSize: 11,
                                  color: colors.dark,
                                }}
                              >
                                {tag}
                              </Text>
                            </View>
                          ))}
                          {tags.length > 5 && (
                            <Text
                              style={{
                                fontFamily: "Inter_500Medium",
                                fontSize: 11,
                                color: colors.warm,
                                paddingVertical: 3,
                              }}
                            >
                              +{tags.length - 5} more
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            fontSize: 12,
                            color: colors.warm,
                            marginTop: 4,
                          }}
                        >
                          No filters set
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteMutation.mutate(s.id)}
                      hitSlop={10}
                      style={{ paddingTop: 2 }}
                    >
                      <Feather name="trash-2" size={16} color={colors.warm} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.white,
            padding: 16,
            paddingBottom: Platform.OS === "ios" ? 30 : 16,
          }}
        >
          <TouchableOpacity
            onPress={handleSave}
            disabled={saveMutation.isPending || !canSave}
            style={{
              height: 44,
              borderRadius: 10,
              backgroundColor: canSave ? colors.dark : colors.border,
              justifyContent: "center",
              alignItems: "center",
              opacity: saveMutation.isPending ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: canSave ? colors.offwhite : colors.warm,
              }}
            >
              {canSave ? "Save current search" : "Set filters first to save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
