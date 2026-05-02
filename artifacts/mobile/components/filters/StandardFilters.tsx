import { View, Text, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { FilterState } from "@workspace/filters";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";

type Props = {
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
};

type Category = { id: string; name: string };
type PriceBounds = { p10: number; p90: number; min: number; max: number };

function formatCompact(n: number): string {
  if (!n) return "Any";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export default function StandardFilters({ filters, setFilters }: Props) {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 5 * 60_000,
  });

  const { data: bounds } = useQuery<PriceBounds>({
    queryKey: ["price-bounds"],
    queryFn: () => apiRequest("/api/properties/price-bounds"),
    staleTime: 5 * 60_000,
  });

  const noneSelected = filters.types.length === 0;

  const toggleType = (name: string) => {
    const lower = name.toLowerCase();
    const current = filters.types;
    const next = current.some((t) => t.toLowerCase() === lower)
      ? current.filter((t) => t.toLowerCase() !== lower)
      : [...current, name];
    setFilters({ types: next });
  };

  const minPlaceholder = bounds ? formatCompact(bounds.p10).replace("$", "") : "Any";
  const maxPlaceholder = bounds ? formatCompact(bounds.p90).replace("$", "") : "Any";

  return (
    <View>
      {/* Type chips with "All" reset */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: "center" }}
        style={{ marginBottom: 10 }}
      >
        <Chip
          label="All"
          active={noneSelected}
          onPress={() => setFilters({ types: [] })}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            active={filters.types.some((t) => t.toLowerCase() === c.name.toLowerCase())}
            onPress={() => toggleType(c.name)}
          />
        ))}
      </ScrollView>

      {/* Price row */}
      <View style={{ paddingHorizontal: 20 }}>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 11,
            color: colors.warm,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 4,
          }}
        >
          Price range (USD)
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <PriceField
            label="Min"
            value={filters.min}
            placeholder={minPlaceholder}
            onChange={(v) => setFilters({ min: v })}
          />
          <PriceField
            label="Max"
            value={filters.max}
            placeholder={maxPlaceholder}
            onChange={(v) => setFilters({ max: v })}
          />
        </View>
      </View>

      {/* Beds + Baths row */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginTop: 8 }}>
        <Stepper
          icon="grid"
          value={filters.beds}
          onChange={(v) => setFilters({ beds: v })}
          label="Beds"
        />
        <Stepper
          icon="droplet"
          value={filters.baths}
          onChange={(v) => setFilters({ baths: v })}
          label="Baths"
          step={0.5}
        />
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 14,
        borderRadius: 16,
        justifyContent: "center",
        backgroundColor: active ? colors.dark : colors.offwhite,
        borderWidth: 1,
        borderColor: active ? colors.dark : colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 12,
          color: active ? colors.offwhite : colors.dark,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PriceField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  placeholder: string;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 40,
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            color: colors.warm,
            marginRight: 6,
            minWidth: 24,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: colors.warm,
            marginRight: 2,
          }}
        >
          $
        </Text>
        <TextInput
          value={value !== undefined ? String(value) : ""}
          onChangeText={(t) => {
            if (!t) {
              onChange(undefined);
              return;
            }
            const digits = t.replace(/[^\d]/g, "");
            if (!digits) {
              onChange(undefined);
              return;
            }
            const n = Number(digits);
            if (Number.isFinite(n)) onChange(n);
          }}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={colors.warm}
          style={{
            flex: 1,
            fontFamily: "Inter_500Medium",
            fontSize: 13,
            color: colors.dark,
            padding: 0,
          }}
        />
        {value !== undefined && (
          <TouchableOpacity onPress={() => onChange(undefined)} hitSlop={8}>
            <Feather name="x" size={14} color={colors.warm} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Stepper({
  icon,
  value,
  onChange,
  label,
  step = 1,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  label: string;
  step?: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        backgroundColor: colors.white,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
      }}
    >
      <Feather name={icon} size={13} color={colors.warm} />
      <TouchableOpacity
        onPress={() => {
          if (value === undefined || value <= step) onChange(undefined);
          else onChange(Math.max(0, value - step));
        }}
        style={{ paddingHorizontal: 6 }}
        hitSlop={8}
      >
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 16, color: colors.warm }}>
          −
        </Text>
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          textAlign: "center",
          fontFamily: "Inter_500Medium",
          fontSize: 12,
          color: colors.dark,
        }}
        numberOfLines={1}
      >
        {value === undefined ? `Any ${label.toLowerCase()}` : `${value}+ ${label.toLowerCase()}`}
      </Text>
      <TouchableOpacity
        onPress={() => onChange((value ?? 0) + step)}
        style={{ paddingHorizontal: 6 }}
        hitSlop={8}
      >
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 16, color: colors.warm }}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}
