import { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ADVANCED_GROUPS, type FilterState } from "@workspace/filters";
import { colors } from "../../constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  onSaveSearch?: () => void;
};

export default function AdvancedFiltersModal({
  visible,
  onClose,
  filters,
  setFilters,
  onSaveSearch,
}: Props) {
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const activeGroup = useMemo(
    () => ADVANCED_GROUPS.find((g) => g.id === activeGroupId) ?? null,
    [activeGroupId]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of ADVANCED_GROUPS) {
      let n = 0;
      for (const opt of group.options) {
        if (filters.features.includes(opt.id)) n++;
      }
      map[group.id] = n;
    }
    return map;
  }, [filters.features]);

  const toggleFeature = (id: string) => {
    const current = filters.features;
    const next = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id];
    setFilters({ features: next });
  };

  const totalSelected = filters.features.length;
  const title = activeGroup ? activeGroup.title : "Advanced search";

  const handleClose = () => {
    setActiveGroupId(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
        {/* Header */}
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
          {activeGroup ? (
            <TouchableOpacity onPress={() => setActiveGroupId(null)}>
              <Feather name="chevron-left" size={22} color={colors.dark} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 18,
              color: colors.dark,
              flex: 1,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={22} color={colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Body */}
        {!activeGroup ? (
          <ScrollView style={{ flex: 1 }}>
            {ADVANCED_GROUPS.map((group, idx) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => setActiveGroupId(group.id)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: idx === ADVANCED_GROUPS.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                  backgroundColor: colors.white,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      color: colors.dark,
                    }}
                  >
                    {group.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      color: colors.warm,
                      marginTop: 2,
                    }}
                  >
                    {group.options.length} options
                  </Text>
                </View>
                {counts[group.id] > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.dark,
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 11,
                        color: colors.offwhite,
                      }}
                    >
                      {counts[group.id]}
                    </Text>
                  </View>
                )}
                <Feather name="chevron-right" size={18} color={colors.warm} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={{ flex: 1, padding: 20 }}>
            {activeGroup.options.map((opt) => {
              const checked = filters.features.includes(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => toggleFeature(opt.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    marginBottom: 8,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: checked ? colors.dark : colors.border,
                    backgroundColor: checked ? "rgba(28,28,28,0.04)" : colors.white,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: checked ? colors.dark : colors.border,
                      backgroundColor: checked ? colors.dark : colors.white,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    {checked && (
                      <Feather name="check" size={12} color={colors.offwhite} />
                    )}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                      color: colors.dark,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Footer */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.white,
            paddingHorizontal: 20,
            paddingVertical: 12,
            paddingBottom: Platform.OS === "ios" ? 30 : 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <TouchableOpacity
            disabled={totalSelected === 0}
            onPress={() => setFilters({ features: [] })}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: totalSelected === 0 ? colors.warm : colors.dark,
              }}
            >
              Clear ({totalSelected})
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {onSaveSearch && (
              <TouchableOpacity
                onPress={onSaveSearch}
                style={{
                  height: 40,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13,
                    color: colors.dark,
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleClose}
              style={{
                height: 40,
                paddingHorizontal: 22,
                borderRadius: 10,
                backgroundColor: colors.dark,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: colors.offwhite,
                }}
              >
                Show results
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
