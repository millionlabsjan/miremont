import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, Image } from "react-native";
import { useAuthStore } from "../../lib/auth";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";
import { router } from "expo-router";

export default function AccountScreen() {
  const { user, logout } = useAuthStore();

  if (user?.role === "agent") return <AgentAccount />;
  if (user?.role === "admin") return <AdminAccount />;
  return <BuyerAccount />;
}

function BuyerAccount() {
  const { user, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifs, setNotifs] = useState({ savedSearches: true, inquiryReplies: true, propertyUpdates: true, newsletter: false });
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const saveProfile = async () => {
    setSaving(true);
    try { await apiRequest("/api/users/profile", { method: "PUT", body: JSON.stringify({ name, email }) }); Alert.alert("Success", "Profile updated"); } catch (err: any) { Alert.alert("Error", err.message); }
    setSaving(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.offwhite }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: colors.dark, textAlign: "center", marginBottom: 4 }}>Account</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm, textAlign: "center", marginBottom: 24 }}>Manage your profile and preferences</Text>

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 16 }}>Personal information</Text>
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.input, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 28, color: colors.dark }}>{initials}</Text>
          </View>
          <TouchableOpacity><Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.dark }}>Change photo</Text></TouchableOpacity>
        </View>

        <Label text="Full name" />
        <Input value={name} onChangeText={setName} />
        <Label text="Email address" />
        <Input value={email} onChangeText={setEmail} keyboardType="email-address" />

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 24, marginBottom: 16 }}>Notification preferences</Text>
        {[
          { key: "savedSearches", label: "New Explore matching saved searches", desc: "Get alerted when listings match your criteria" },
          { key: "inquiryReplies", label: "Inquiry replies", desc: "Get notified when agents respond" },
          { key: "propertyUpdates", label: "Property updates", desc: "Stay informed on price updates or status changes" },
          { key: "newsletter", label: "Newsletter", desc: "Receive curated property news" },
        ].map((item) => (
          <View key={item.key} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 16 }}><Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>{item.label}</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm, marginTop: 2 }}>{item.desc}</Text></View>
            <Switch value={(notifs as any)[item.key]} onValueChange={(v) => setNotifs((n) => ({ ...n, [item.key]: v }))} trackColor={{ false: colors.border, true: colors.dark }} thumbColor={colors.white} />
          </View>
        ))}

        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginTop: 8, marginBottom: 16 }}>Change password</Text>
        <Label text="Enter current password" />
        <Input value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Label text="Enter new password" />
        <Input value={newPassword} onChangeText={setNewPassword} secureTextEntry />

        <View style={{ flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 24 }}>
          <TouchableOpacity onPress={saveProfile} disabled={saving} style={{ flex: 1, height: 48, backgroundColor: colors.dark, borderRadius: 10, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.offwhite }}>{saving ? "Saving..." : "Save changes"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.white }}>
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: colors.dark }}>Discard</Text>
          </TouchableOpacity>
        </View>

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
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const tabs = ["Overview", "Articles", "Security", "Settings"];

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
            {/* Profile + Stats */}
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, backgroundColor: colors.white, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.offwhite }}>{initials}</Text>
              </View>
              <View><Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark }}>{user?.name}</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>System Administrator</Text><Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.warm }}>{user?.email}</Text></View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {[{ label: "Total Users", value: "1,284" }, { label: "Active Agents", value: "347" }, { label: "Live Listings", value: "892" }].map((s) => (
                <View key={s.label} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.white, minWidth: 120 }}>
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color: colors.warm, textTransform: "uppercase" }}>{s.label}</Text>
                  <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, color: colors.dark, marginTop: 4 }}>{s.value}</Text>
                </View>
              ))}
            </ScrollView>

            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 16, color: colors.dark, marginBottom: 8 }}>All Users</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.warm, marginBottom: 16 }}>User management available in web dashboard</Text>
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
