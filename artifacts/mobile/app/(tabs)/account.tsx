import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Image } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../lib/auth";
import { apiRequest, apiUpload } from "../../lib/api";
import { colors, API_URL } from "../../constants/theme";
import { router } from "expo-router";

export default function AccountScreen() {
  const { user, logout } = useAuthStore();

  if (user?.role === "agent") return <AgentAccount />;
  if (user?.role === "admin") return <AdminAccount />;
  return <BuyerAccount />;
}

const CURRENCIES = [
  { code: "EUR", label: "EUR — Euro" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "GBP", label: "GBP — British Pound" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
];

function BuyerAccount() {
  const { user, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || "en");
  const [preferredCurrency, setPreferredCurrency] = useState(user?.preferredCurrency || "USD");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const defaultNotifs = { savedSearches: true, inquiryReplies: true, propertyUpdates: true, newsletter: false };
  const [notifs, setNotifs] = useState({ ...defaultNotifs, ...user?.notificationPrefs });
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  const autoSave = async (updates: Record<string, any>) => {
    try {
      const updated = await apiRequest("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      useAuthStore.getState().setUser(updated);
    } catch {}
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }
    setChangingPassword(true);
    try {
      await apiRequest("/api/users/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password updated");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setChangingPassword(false);
  };

  const pickAndUploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/jpeg";

      const formData = new FormData();
      formData.append("avatar", { uri, name: filename, type: mimeType } as any);

      const updated = await apiUpload("/api/users/profile/avatar", formData);
      useAuthStore.getState().setUser(updated);
    } catch (err: any) {
      Alert.alert("Upload failed", err.message);
    }
  };

  const removeAvatar = async () => {
    try {
      const updated = await apiRequest("/api/users/profile/avatar", { method: "DELETE" });
      useAuthStore.getState().setUser(updated);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4, position: "relative" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", left: 0, padding: 4 }}>
            <Feather name="chevron-left" size={24} color={colors.dark} />
          </TouchableOpacity>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, textAlign: "center" }}>Account</Text>
        </View>

        <View style={{ height: 1, backgroundColor: colors.border, marginTop: 12, marginBottom: 16 }} />
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm, marginBottom: 24 }}>Manage your profile and preferences</Text>

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 16 }}>Personal information</Text>

        {/* Avatar with camera overlay */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.7} style={{ position: "relative", marginBottom: 8 }}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl?.startsWith("http") ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }} style={{ width: 100, height: 100, borderRadius: 50 }} />
            ) : (
              <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.input, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 32, color: colors.dark }}>{initials}</Text>
              </View>
            )}
            <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}>
              <Feather name="camera" size={14} color={colors.offwhite} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickAndUploadAvatar}><Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>Change photo</Text></TouchableOpacity>
          <TouchableOpacity onPress={removeAvatar}><Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 2 }}>Remove</Text></TouchableOpacity>
        </View>

        <Label text="Full name" />
        <Input value={name} onChangeText={setName} onBlur={() => name !== user?.name && autoSave({ name })} />
        <Label text="Email address" />
        <Input value={email} onChangeText={setEmail} keyboardType="email-address" onBlur={() => email !== user?.email && autoSave({ email })} />
        <Label text="Phone number" />
        <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 (555) 123 4567" placeholderTextColor={colors.warm} onBlur={() => phone !== (user?.phone || "") && autoSave({ phone })} />
        <Label text="Preferred language" />
        <TouchableOpacity
          onPress={() => setShowLangPicker(!showLangPicker)}
          style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.white, marginBottom: showLangPicker ? 0 : 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: preferredLanguage ? colors.dark : colors.warm }}>
            {LANGUAGES.find((l) => l.code === preferredLanguage)?.label || "Select language"}
          </Text>
          <Feather name={showLangPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.warm} />
        </TouchableOpacity>
        {showLangPicker && (
          <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: colors.white, marginBottom: 16, overflow: "hidden" }}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => { setPreferredLanguage(lang.code); setShowLangPicker(false); autoSave({ preferredLanguage: lang.code }); }}
                style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: preferredLanguage === lang.code ? colors.input : colors.white }}
              >
                <Text style={{ fontFamily: preferredLanguage === lang.code ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 15, color: colors.dark }}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Label text="Preferred currency" />
        <TouchableOpacity
          onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
          style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, backgroundColor: colors.white, marginBottom: showCurrencyPicker ? 0 : 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: preferredCurrency ? colors.dark : colors.warm }}>
            {CURRENCIES.find((c) => c.code === preferredCurrency)?.label || "Select currency"}
          </Text>
          <Feather name={showCurrencyPicker ? "chevron-up" : "chevron-down"} size={18} color={colors.warm} />
        </TouchableOpacity>
        {showCurrencyPicker && (
          <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: colors.white, marginBottom: 16, overflow: "hidden" }}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr.code}
                onPress={() => { setPreferredCurrency(curr.code); setShowCurrencyPicker(false); autoSave({ preferredCurrency: curr.code }); }}
                style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: preferredCurrency === curr.code ? colors.input : colors.white }}
              >
                <Text style={{ fontFamily: preferredCurrency === curr.code ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 15, color: colors.dark }}>{curr.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* How others see you */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 8, marginBottom: 16 }}>How others see you</Text>
        <View style={{ backgroundColor: colors.input, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 24 }}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl?.startsWith("http") ? user.avatarUrl : `${API_URL}${user.avatarUrl}` }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.white, marginBottom: 12 }} />
          ) : (
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: colors.white, marginBottom: 12 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 24, color: colors.dark }}>{initials}</Text>
            </View>
          )}
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: colors.dark }}>{name || user?.name}</Text>
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.accent, marginTop: 4 }}>Property Buyer</Text>
          {memberSince ? <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>Member since {memberSince}</Text> : null}
        </View>

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 16 }}>Notification preferences</Text>
        {[
          { key: "savedSearches", label: "New Explore matching saved searches", desc: "Get alerted when listings match your criteria" },
          { key: "inquiryReplies", label: "Inquiry replies", desc: "Get notified when agents respond" },
          { key: "propertyUpdates", label: "Property updates", desc: "Stay informed on price updates or status changes" },
          { key: "newsletter", label: "Newsletter", desc: "Receive curated property news" },
        ].map((item) => (
          <View key={item.key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 16 }}><Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>{item.label}</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{item.desc}</Text></View>
            <Switch value={(notifs as any)[item.key]} onValueChange={(v) => { const updated = { ...notifs, [item.key]: v }; setNotifs(updated); autoSave({ notificationPrefs: updated }); }} trackColor={{ false: colors.border, true: colors.dark }} thumbColor={colors.white} />
          </View>
        ))}

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 8, marginBottom: 16 }}>Change password</Text>
        <Label text="Enter current password" />
        <Input value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Label text="Enter new password" />
        <Input value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <Label text="Enter new password again" />
        <Input value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <TouchableOpacity onPress={changePassword} disabled={changingPassword} style={{ height: 48, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 16, marginBottom: 24 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.offwhite }}>{changingPassword ? "Updating..." : "Change password"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={logout} style={{ height: 48, borderWidth: 1, borderColor: colors.red, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.red }}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AgentAccount() {
  const { user, logout } = useAuthStore();
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const [notifs, setNotifs] = useState({ enquiries: true, inquiryReplies: true, propertyUpdates: true, newsletter: false });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark }}>Account</Text>
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </View>

        {/* Profile card */}
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, backgroundColor: colors.white, marginBottom: 16, alignItems: "center" }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.input, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.dark }}>{initials}</Text>
          </View>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 18, color: colors.dark }}>{user?.agencyName || user?.name}</Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>{user?.email}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: colors.warm }}>Pro Plan</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Renews 15 Feb 2026</Text>
          </View>
        </View>

        {/* Your properties */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 12 }}>Your properties</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white }}>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark }}>12</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>ACTIVE</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white }}>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark }}>3</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>HIDDEN</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push("/listings" as any)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View><Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>My listings</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>12 active · 3 hidden · 2 drafts</Text></View>
            <Text style={{ color: colors.warm }}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 16 }}>⚠️</Text>
          <View style={{ flex: 1 }}><Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>3 listings hidden</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Not updated in 30+ days. Tap to review.</Text></View>
        </View>

        {/* Settings */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 12 }}>Settings</Text>
        {["Profile & agency details", "Notifications", "Language", "Currency", "Appearance"].map((item) => (
          <TouchableOpacity key={item} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>{item}</Text>
            <Text style={{ color: colors.warm }}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Subscription */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 16, marginBottom: 12 }}>Subscription</Text>
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, backgroundColor: colors.white, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>Pro Plan</Text>
            <View style={{ backgroundColor: colors.dark, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.offwhite }}>ACTIVE</Text>
            </View>
          </View>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>Renews 15 Feb 2026 · USD 99/month</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {["20 listings", "Chat support", "Analytics"].map((f) => (<View key={f} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm }}>{f}</Text></View>))}
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={{ flex: 1, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>Manage plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>Billing history</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification preferences */}
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 12 }}>Notification preferences</Text>
        {[
          { key: "enquiries", label: "Enquiries", desc: "Get alerted when someone enquires your property" },
          { key: "inquiryReplies", label: "Inquiry replies", desc: "Get notified when buyers respond" },
          { key: "propertyUpdates", label: "Property updates", desc: "Stay informed on price updates or status changes" },
          { key: "newsletter", label: "Newsletter", desc: "Receive curated property news" },
        ].map((item) => (
          <View key={item.key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 16 }}><Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>{item.label}</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{item.desc}</Text></View>
            <Switch value={(notifs as any)[item.key]} onValueChange={(v) => setNotifs((n) => ({ ...n, [item.key]: v }))} trackColor={{ false: colors.border, true: colors.dark }} thumbColor={colors.white} />
          </View>
        ))}

        <TouchableOpacity onPress={logout} style={{ height: 48, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.offwhite }}>Log out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.red }}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AdminAccount() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const tabs = ["Overview", "Articles", "Security", "Settings"];
  const queryClient = useQueryClient();

  const filterParams = (() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter === "active" || filter === "inactive") params.set("status", filter);
    if (filter === "agents") params.set("role", "agent");
    if (filter === "buyers") params.set("role", "buyer");
    params.set("limit", "50");
    return params.toString();
  })();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiRequest("/api/users/stats"),
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users", filterParams],
    queryFn: () => apiRequest(`/api/users?${filterParams}`),
  });

  const allUsers = usersData?.users ?? [];

  const updateStatus = async (userId: string, status: string) => {
    await apiRequest(`/api/users/${userId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getUserInitials = (name?: string) => name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.dark, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.offwhite }}>The Property Catalogue</Text>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warm, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.dark }}>{initials}</Text>
          </View>
        </View>

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark }}>My Account</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm, marginBottom: 16 }}>{user?.email}</Text>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 4 }}>
          {tabs.map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activeTab === tab ? colors.dark : "transparent" }}>
              <Text style={{ fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 14, color: activeTab === tab ? colors.dark : colors.warm }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === "Overview" && (
          <>
            {/* Profile card */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, backgroundColor: colors.white, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.offwhite }}>{initials}</Text>
              </View>
              <View><Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>{user?.name}</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>System Administrator</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>{user?.email}</Text></View>
            </View>

            {/* Stat cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {[
                { label: "Total Users", value: stats?.totalUsers ?? "–" },
                { label: "Active Agents", value: stats?.activeAgents ?? "–" },
                { label: "Live Listings", value: stats?.liveListings ?? "–" },
              ].map((s) => (
                <View key={s.label} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, minWidth: 120 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase" }}>{s.label}</Text>
                  <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark, marginTop: 4 }}>{s.value}</Text>
                </View>
              ))}
            </ScrollView>

            {/* All Users header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>All Users</Text>
            </View>

            {/* Search */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="search" size={16} color={colors.warm} />
              <TextInput
                placeholder="Search by name or email..."
                placeholderTextColor={colors.warm}
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark, padding: 0 }}
              />
            </View>

            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
                { key: "agents", label: "Agents" },
                { key: "buyers", label: "Buyers" },
              ].map((f) => (
                <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: filter === f.key ? colors.dark : colors.white, borderWidth: 1, borderColor: filter === f.key ? colors.dark : colors.border }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: filter === f.key ? colors.offwhite : colors.warm }}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* User list */}
            {allUsers.length === 0 ? (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>No users found</Text>
            ) : (
              allUsers.map((u: any) => (
                <View key={u.id} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.white, marginBottom: 12, overflow: "hidden" }}>
                  <View style={{ padding: 16 }}>
                    {/* Avatar + Name + Role badge */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.border, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 18, color: colors.dark }}>{getUserInitials(u.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                          <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, color: colors.dark }}>{u.name || "Unnamed"}</Text>
                          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.warm, textTransform: "uppercase" }}>{u.role}</Text>
                          </View>
                        </View>
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginTop: 2 }}>{u.email}</Text>
                      </View>
                    </View>

                    {/* Status + Joined date */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: u.status === "active" ? colors.dark : "transparent", borderWidth: u.status === "active" ? 0 : 1.5, borderColor: colors.warm }} />
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: u.status === "active" ? colors.dark : colors.warm }}>{u.status === "active" ? "Active" : "Inactive"}</Text>
                      </View>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm }}>Joined {formatDate(u.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Separator line */}
                  <View style={{ height: 1, backgroundColor: colors.border }} />

                  {/* Action buttons */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {u.status === "active" ? (
                        <TouchableOpacity onPress={() => Alert.alert("Deactivate user?", `This will deactivate ${u.name}.`, [{ text: "Cancel" }, { text: "Deactivate", style: "destructive", onPress: () => updateStatus(u.id, "inactive") }])} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>Deactivate</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => updateStatus(u.id, "active")} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>Activate</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => Alert.alert("Delete user?", `This will permanently delete ${u.name}.`, [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => updateStatus(u.id, "deleted") }])} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.warm }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => router.push(`/admin/plan/${u.id}`)}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === "Security" && (
          <>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 16 }}>Security</Text>
            {[
              { label: "Password", desc: "Last changed 3 months ago", action: "Change →" },
              { label: "Two-factor auth", desc: "Authenticator app enabled", toggle: true },
              { label: "Active sessions", desc: "2 devices logged in", action: "Manage →" },
              { label: "Last login", desc: "Today 09:42 · London, UK" },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
                <View><Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>{item.label}</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>{item.desc}</Text></View>
                {item.toggle ? <Switch value={true} trackColor={{ false: colors.border, true: colors.dark }} thumbColor={colors.white} /> : item.action ? <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>{item.action}</Text> : null}
              </View>
            ))}

            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 16, marginBottom: 12 }}>Notifications</Text>
            {["New user registrations", "Flagged accounts", "Failed payments", "Stale listing alerts", "System errors"].map((label) => (
              <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>{label}</Text>
                <Switch value={true} trackColor={{ false: colors.border, true: colors.dark }} thumbColor={colors.white} />
              </View>
            ))}
          </>
        )}

        {activeTab === "Settings" && (
          <>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 12 }}>Preferences</Text>
            {[{ label: "Language", value: "English" }, { label: "Timezone", value: "Europe/London" }, { label: "Appearance", value: "Light" }, { label: "Currency display", value: "USD" }].map((item) => (
              <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>{item.label}</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>{item.value}</Text>
              </View>
            ))}

            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 16, marginBottom: 12 }}>Admin access</Text>
            {["User Management", "Article Management", "Plan Management", "Platform Settings"].map((perm) => (
              <View key={perm} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>{perm}</Text>
                <View style={{ borderWidth: 1, borderColor: colors.dark, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.dark }}>FULL ACCESS</Text>
                </View>
              </View>
            ))}

            <View style={{ marginTop: 24 }}>
              <TouchableOpacity onPress={logout} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, marginBottom: 8 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark }}>Log out</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === "Articles" && (
          <>
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 12 }}>Articles</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm }}>Article management available in web dashboard. You can view articles in the Articles tab of the main app.</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}

// Reusable components
function Label({ text }: { text: string }) {
  return <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{text}</Text>;
}

function Input(props: any) {
  return <TextInput {...props} style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: colors.dark, backgroundColor: colors.white, marginBottom: 16, ...props.style }} />;
}
