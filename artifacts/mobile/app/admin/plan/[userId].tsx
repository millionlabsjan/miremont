import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { apiRequest } from "../../../lib/api";
import { colors } from "../../../constants/theme";

const ALL_FEATURES = [
  { key: "pool", label: "Pool" },
  { key: "chat_support", label: "Chat support" },
  { key: "analytics", label: "Analytics" },
  { key: "priority_search", label: "Priority search" },
  { key: "custom_branding", label: "Custom branding" },
  { key: "team_seats", label: "Team seats" },
];

export default function PlanManagementScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-subscription", userId],
    queryFn: () => apiRequest(`/api/users/${userId}/subscription`),
  });

  const [planName, setPlanName] = useState("");
  const [listingSlots, setListingSlots] = useState(10);
  const [planExpiry, setPlanExpiry] = useState("");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [iosPickerOpen, setIosPickerOpen] = useState(false);

  const onExpiryChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "set" && selected) {
      setPlanExpiry(selected.toISOString().split("T")[0]);
    }
  };

  const openExpiryPicker = () => {
    const initial = planExpiry ? new Date(planExpiry) : new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: initial, mode: "date", onChange: onExpiryChange });
    } else {
      setIosPickerOpen(true);
    }
  };

  const state = data?.state as "no_plan" | "custom" | "stripe" | undefined;
  const user = data?.user;
  const subscription = data?.subscription;
  const plan = data?.plan;

  useEffect(() => {
    if (state === "custom" && subscription) {
      setPlanName(subscription.customPlanName || "");
      setListingSlots(subscription.listingSlotsOverride || plan?.listingSlots || 10);
      setPlanExpiry(subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString().split("T")[0] : "");
      setFeatures(subscription.featuresOverride || plan?.features || {});
      setNotes(subscription.internalNotes || "");
    }
  }, [state, subscription, plan]);

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const toggleFeature = (key: string) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!planName.trim()) return Alert.alert("Plan name is required");
    setSaving(true);
    try {
      await apiRequest(`/api/users/${userId}/subscription`, {
        method: "PUT",
        body: JSON.stringify({
          customPlanName: planName,
          listingSlots,
          features,
          planExpiry: planExpiry || null,
          internalNotes: notes || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["user-subscription", userId] });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert("Remove custom plan?", "This will remove the subscription from this user.", [
      { text: "Cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          try {
            await apiRequest(`/api/users/${userId}/subscription`, { method: "DELETE" });
            queryClient.invalidateQueries({ queryKey: ["user-subscription", userId] });
            Alert.alert("Removed", "Custom plan has been removed.");
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>Loading...</Text>
      </View>
    );
  }

  if (error || !data?.user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.offwhite, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark, marginBottom: 8 }}>Failed to load user</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, textAlign: "center", marginBottom: 20 }}>{(error as any)?.message || "Could not connect to the server. Check your network and try again."}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Header bar */}
        <View style={{ backgroundColor: colors.dark, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 16, color: colors.offwhite }}>The Property Catalogue</Text>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warm, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.dark }}>MA</Text>
          </View>
        </View>

        {/* Breadcrumb */}
        <View style={{ backgroundColor: "#f4f1ee", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>User Management › Plan Management</Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Title */}
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark }}>Plan Management</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 4, marginBottom: 20 }}>Assign or adjust custom subscription values.</Text>

          {/* User card */}
          <View style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.dark }}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.dark }}>{user?.name}</Text>
                  <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 }}>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase" }}>{user?.role}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{user?.email}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ borderWidth: 1, borderColor: state === "custom" ? colors.dark : colors.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: state === "stripe" ? colors.warm : colors.dark }}>
                  {state === "stripe" ? "Stripe Active" : state === "custom" ? "Custom Plan" : "No Plan"}
                </Text>
              </View>
            </View>
          </View>

          {/* State-dependent content */}
          {state === "stripe" && (
            <>
              {/* Stripe locked notice */}
              <View style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 16, flexDirection: "row", gap: 12, marginBottom: 24 }}>
                <Feather name="lock" size={20} color={colors.dark} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Plan editing unavailable</Text>
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 4 }}>This user has an active Stripe subscription. Editing is disabled until they cancel through Stripe.</Text>
                </View>
              </View>

              {/* Current Stripe Plan table */}
              <Text style={{ fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 16, color: colors.dark, marginBottom: 8 }}>Current Stripe Plan</Text>
              <View style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: "hidden" }}>
                {[
                  { label: "Plan name", value: plan?.name || "–" },
                  { label: "Listing slots", value: String(plan?.listingSlots || "–") },
                  { label: "Billing cycle", value: "Monthly" },
                  { label: "Renewal", value: subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "–" },
                  { label: "Stripe ID", value: subscription?.stripeSubscriptionId ? `cus_••••${subscription.stripeSubscriptionId.slice(-4)}` : "–" },
                ].map((row, i, arr) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, height: 52, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.6 }}>{row.label}</Text>
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.warm }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {(state === "no_plan" || state === "custom") && (
            <>
              {/* Info box */}
              <View style={{ borderWidth: state === "custom" ? 1 : 2, borderColor: colors.dark, borderRadius: 10, padding: 18, marginBottom: 24 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>
                  {state === "custom" ? "Edit custom plan" : "Assign a custom plan"}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 4 }}>
                  {state === "custom"
                    ? `Changes take effect immediately. Last updated ${subscription?.createdAt ? formatDate(subscription.createdAt) : "–"}.`
                    : "This user has no subscription. Configure values below. Collect payment off-platform."}
                </Text>
              </View>

              {/* Plan Configuration form */}
              <Text style={{ fontFamily: "PlayfairDisplay_600SemiBold", fontSize: 16, color: colors.dark, marginBottom: 16 }}>Plan Configuration</Text>

              {/* Plan name */}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.55, marginBottom: 6 }}>Plan name</Text>
              <View style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, height: 48, justifyContent: "center", marginBottom: 14 }}>
                <TextInput
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="e.g. Custom Agency Pro"
                  placeholderTextColor={colors.warm}
                  textAlignVertical="center"
                  includeFontPadding={false}
                  style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark, padding: 0 }}
                />
              </View>

              {/* Listing slots */}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.55, marginBottom: 6 }}>Listing slots</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <TouchableOpacity onPress={() => setListingSlots(Math.max(1, listingSlots - 1))} style={{ width: 40, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
                  <Feather name="minus" size={20} color={colors.dark} />
                </TouchableOpacity>
                <View style={{ width: 80, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.dark }}>{listingSlots}</Text>
                </View>
                <TouchableOpacity onPress={() => setListingSlots(listingSlots + 1)} style={{ width: 40, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
                  <Feather name="plus" size={20} color={colors.dark} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginBottom: 14 }}>Number of active listings this user can have.</Text>

              {/* Plan expiry */}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.55, marginBottom: 6 }}>Plan expiry</Text>
              <TouchableOpacity
                onPress={openExpiryPicker}
                activeOpacity={0.7}
                style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, height: 48, flexDirection: "row", alignItems: "center", marginBottom: 6 }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: planExpiry ? colors.dark : colors.warm,
                  }}
                >
                  {planExpiry ? formatDate(planExpiry) : "Select expiry date"}
                </Text>
                {planExpiry ? (
                  <TouchableOpacity onPress={() => setPlanExpiry("")} hitSlop={8} style={{ marginRight: 10 }}>
                    <Feather name="x" size={16} color={colors.warm} />
                  </TouchableOpacity>
                ) : null}
                <Feather name="calendar" size={16} color={colors.warm} />
              </TouchableOpacity>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginBottom: 14 }}>Leave blank for no expiry.</Text>
              {iosPickerOpen && Platform.OS === "ios" && (
                <View style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginBottom: 14, paddingVertical: 8 }}>
                  <DateTimePicker
                    value={planExpiry ? new Date(planExpiry) : new Date()}
                    mode="date"
                    display="inline"
                    onChange={(_event, selected) => {
                      if (selected) setPlanExpiry(selected.toISOString().split("T")[0]);
                      setIosPickerOpen(false);
                    }}
                  />
                </View>
              )}

              {/* Features included */}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.55, marginBottom: 6 }}>Features included</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {ALL_FEATURES.map((f) => {
                  const active = features[f.key] === true;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => toggleFeature(f.key)}
                      style={{
                        backgroundColor: active ? colors.dark : colors.offwhite,
                        borderWidth: active ? 0 : 1,
                        borderColor: colors.border,
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{
                        fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                        fontSize: 12,
                        color: active ? colors.offwhite : colors.warm,
                      }}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Internal notes */}
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.55, marginBottom: 6 }}>Internal notes</Text>
              <View style={{ backgroundColor: "#f4f1ee", borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, height: 72, marginBottom: 14 }}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Payment terms, notes…"
                  placeholderTextColor={colors.warm}
                  multiline
                  style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.dark, padding: 0, flex: 1, textAlignVertical: "top" }}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar — only for editable states */}
      {(state === "no_plan" || state === "custom") && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.offwhite, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 17, paddingBottom: 34 }}>
          <View style={{ flexDirection: "row", gap: 16, marginBottom: 10 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={{ flex: 1.6, height: 48, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center", opacity: saving ? 0.6 : 1 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.offwhite }}>{saving ? "Saving..." : "Save changes"}</Text>
            </TouchableOpacity>
          </View>
          {state === "custom" && (
            <TouchableOpacity onPress={handleRemove} style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.warm, textDecorationLine: "underline" }}>Remove custom plan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Back button for Stripe view */}
      {state === "stripe" && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.offwhite, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingTop: 17, paddingBottom: 34 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
