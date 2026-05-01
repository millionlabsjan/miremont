import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { apiRequest } from "../../lib/api";
import { colors } from "../../constants/theme";
import { useAuthStore } from "../../lib/auth";

const LANGUAGES = ["EN", "FR", "ES", "AR"] as const;
type Lang = typeof LANGUAGES[number];

const LANG_FIELD_MAP: Record<Lang, { title: string; body: string }> = {
  EN: { title: "titleEn", body: "bodyEn" },
  FR: { title: "titleFr", body: "bodyFr" },
  ES: { title: "titleEs", body: "bodyEs" },
  AR: { title: "titleAr", body: "bodyAr" },
};

export default function ArticleEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [title, setTitle] = useState<Record<Lang, string>>({ EN: "", FR: "", ES: "", AR: "" });
  const [body, setBody] = useState<Record<Lang, string>>({ EN: "", FR: "", ES: "", AR: "" });
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [authorId, setAuthorId] = useState(user?.id || "");
  const [authorName, setAuthorName] = useState(user?.name || "");
  const [slug, setSlug] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [activeLang, setActiveLang] = useState<Lang>("EN");
  const [showDiscard, setShowDiscard] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAuthorPicker, setShowAuthorPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 2],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setThumbnailUrl(result.assets[0].uri);
      setDirty(true);
    }
  };

  const { data: categories } = useQuery({
    queryKey: ["article-categories"],
    queryFn: () => apiRequest("/api/articles/categories") as Promise<string[]>,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-for-picker"],
    queryFn: () => apiRequest("/api/users?limit=100"),
  });
  const allUsers = usersData?.users ?? [];

  // Load existing article for editing
  useEffect(() => {
    if (!id) return;
    apiRequest(`/api/articles?limit=50&status=all`).then((data) => {
      const article = data.articles?.find((a: any) => a.id === id);
      if (article) {
        setTitle({
          EN: article.content?.titleEn || "",
          FR: article.content?.titleFr || "",
          ES: article.content?.titleEs || "",
          AR: article.content?.titleAr || "",
        });
        setBody({
          EN: article.content?.bodyEn || "",
          FR: article.content?.bodyFr || "",
          ES: article.content?.bodyEs || "",
          AR: article.content?.bodyAr || "",
        });
        setCategory(article.category || "");
        setStatus(article.status === "published" ? "published" : "draft");
        setSlug(article.slug || "");
        setThumbnailUrl(article.thumbnailUrl || "");
        setAuthorId(article.authorId || user?.id || "");
        setAuthorName(article.author?.name || user?.name || "");
      }
    });
  }, [id]);

  const generateSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleTitleChange = (text: string) => {
    setTitle((prev) => ({ ...prev, [activeLang]: text }));
    if (activeLang === "EN" && !isEditing) setSlug(generateSlug(text));
    setDirty(true);
  };

  const handleBodyChange = (text: string) => {
    setBody((prev) => ({ ...prev, [activeLang]: text }));
    setDirty(true);
  };

  const handleClose = () => {
    if (dirty) {
      setShowDiscard(true);
    } else {
      router.back();
    }
  };

  const save = async (asStatus: "draft" | "published" | "archived") => {
    if (!title.EN.trim()) {
      Alert.alert("Error", "Article title (EN) is required");
      return;
    }
    const articleSlug = slug || generateSlug(title.EN);
    setSaving(true);
    try {
      if (isEditing) {
        // Update metadata (category, status, thumbnail, author)
        await apiRequest(`/api/articles/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            slug: articleSlug,
            category: category || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            status: asStatus,
            authorId: authorId || undefined,
          }),
        });
        // Create new content version
        await apiRequest(`/api/articles/${id}/content`, {
          method: "POST",
          body: JSON.stringify({
            titleEn: title.EN, titleFr: title.FR || undefined, titleEs: title.ES || undefined, titleAr: title.AR || undefined,
            bodyEn: body.EN || undefined, bodyFr: body.FR || undefined, bodyEs: body.ES || undefined, bodyAr: body.AR || undefined,
            setAsCurrent: true,
          }),
        });
      } else {
        await apiRequest("/api/articles", {
          method: "POST",
          body: JSON.stringify({
            slug: articleSlug,
            category: category || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            titleEn: title.EN,
            titleFr: title.FR || undefined,
            titleEs: title.ES || undefined,
            titleAr: title.AR || undefined,
            bodyEn: body.EN || undefined,
            bodyFr: body.FR || undefined,
            bodyEs: body.ES || undefined,
            bodyAr: body.AR || undefined,
          }),
        });
        // If publishing, update status
        if (asStatus === "published") {
          const articles = await apiRequest("/api/articles?limit=1&status=all");
          const newArticle = articles.articles?.find((a: any) => a.slug === articleSlug);
          if (newArticle) {
            await apiRequest(`/api/articles/${newArticle.id}`, {
              method: "PUT",
              body: JSON.stringify({ status: "published" }),
            });
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      Alert.alert("Success", isEditing ? "Article updated" : "Article created");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setSaving(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.offwhite }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, color: colors.dark }}>{isEditing ? "Edit Article" : "New Article"}</Text>
        <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
          <Feather name="x" size={22} color={colors.dark} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
          {/* Cover image */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Cover image</Text>
          <TouchableOpacity onPress={pickImage} style={{ height: 180, borderWidth: 1, borderColor: colors.border, borderStyle: thumbnailUrl ? "solid" : "dashed", borderRadius: 14, backgroundColor: colors.input, overflow: "hidden", justifyContent: "center", alignItems: "center", marginBottom: 17 }}>
            {thumbnailUrl ? (
              <View style={{ width: "100%", height: "100%" }}>
                <Image source={{ uri: thumbnailUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(28,28,28,0.6)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="edit-2" size={12} color={colors.offwhite} />
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: colors.offwhite }}>Change</Text>
                </View>
              </View>
            ) : (
              <>
                <Feather name="upload" size={28} color={colors.dark} />
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.dark, marginTop: 8 }}>Tap to upload cover image</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.warm, marginTop: 4 }}>JPG or PNG, recommended 1200×800px</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Title */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Article title</Text>
          <TextInput
            value={title[activeLang]}
            onChangeText={handleTitleChange}
            placeholder="Enter article title…"
            placeholderTextColor="rgba(184,173,164,0.5)"
            style={{ height: 57, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.input, paddingHorizontal: 17, fontFamily: "PlayfairDisplay_400Regular", fontSize: 18, color: colors.dark, marginBottom: 17 }}
          />

          {/* Category */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Category</Text>
          <TouchableOpacity onPress={() => setShowCategoryPicker(true)} style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.offwhite, paddingHorizontal: 17, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 17 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: category ? colors.dark : colors.warm }}>{category || "Select a category"}</Text>
            <Feather name="chevron-down" size={16} color={colors.warm} />
          </TouchableOpacity>

          {/* Language tabs */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 17 }} contentContainerStyle={{ gap: 8 }}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang} onPress={() => setActiveLang(lang)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: activeLang === lang ? colors.dark : colors.offwhite, borderWidth: 1, borderColor: activeLang === lang ? colors.dark : colors.border }}>
                <Text style={{ fontFamily: activeLang === lang ? "Inter_600SemiBold" : "Inter_500Medium", fontSize: 12, color: activeLang === lang ? colors.offwhite : colors.warm }}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Content</Text>
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.input, overflow: "hidden", marginBottom: 17 }}>
            {/* Toolbar */}
            <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              {(["bold", "italic", "type", "link", "image", "list"] as const).map((icon) => (
                <TouchableOpacity key={icon} style={{ width: 22, height: 22, justifyContent: "center", alignItems: "center" }}>
                  <Feather name={icon} size={18} color={colors.warm} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={body[activeLang]}
              onChangeText={handleBodyChange}
              placeholder="Write your article content here…"
              placeholderTextColor="rgba(184,173,164,0.5)"
              multiline
              textAlignVertical="top"
              style={{ minHeight: 180, padding: 16, fontFamily: "Inter_400Regular", fontSize: 14, color: colors.dark, lineHeight: 24 }}
            />
          </View>

          {/* Status */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Status</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 17 }}>
            {(["draft", "published", "archived"] as const).map((s) => (
              <TouchableOpacity key={s} onPress={() => { setStatus(s); setDirty(true); }} style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: status === s ? colors.dark : colors.offwhite, borderWidth: 1, borderColor: status === s ? colors.dark : colors.border, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: status === s ? "Inter_600SemiBold" : "Inter_500Medium", fontSize: 13, color: status === s ? colors.offwhite : colors.warm, textTransform: "capitalize" }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Author */}
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: colors.warm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Author</Text>
          <TouchableOpacity onPress={() => setShowAuthorPicker(true)} style={{ height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.input, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: authorName ? colors.dark : colors.warm }}>{authorName || "Select author"}</Text>
            <Feather name="chevron-down" size={16} color={colors.warm} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom action bar */}
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.offwhite }}>
        <TouchableOpacity onPress={() => save("draft")} disabled={saving} style={{ flex: 1, height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.offwhite, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Save as draft</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => save(status)} disabled={saving} style={{ flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.offwhite }}>
            {saving ? "Saving…" : status === "archived" ? "Archive" : status === "published" ? "Publish" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Discard changes bottom sheet */}
      <Modal visible={showDiscard} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setShowDiscard(false)} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.6)", justifyContent: "flex-end" }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: colors.offwhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: colors.border, padding: 12 }}>
            <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 8 }}>Discard changes?</Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.warm, lineHeight: 22, marginBottom: 24 }}>You have unsaved changes. If you leave now, your progress will be lost.</Text>
              <TouchableOpacity onPress={() => { setShowDiscard(false); router.back(); }} style={{ height: 48, borderRadius: 10, backgroundColor: colors.dark, justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.offwhite }}>Discard changes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDiscard(false)} style={{ height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.offwhite, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.dark }}>Keep editing</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Category picker bottom sheet */}
      <Modal visible={showCategoryPicker} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setShowCategoryPicker(false)} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.4)", justifyContent: "flex-end" }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: colors.offwhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 12 }}>
            <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 16 }}>Select category</Text>
              {(categories || []).map((cat) => (
                <TouchableOpacity key={cat} onPress={() => { setCategory(cat); setShowCategoryPicker(false); setDirty(true); }} style={{ height: 48, borderWidth: 1, borderColor: category === cat ? colors.dark : colors.border, borderRadius: 10, backgroundColor: category === cat ? colors.dark : colors.white, justifyContent: "center", paddingHorizontal: 16, marginBottom: 8 }}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: category === cat ? colors.offwhite : colors.dark }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Author picker bottom sheet */}
      <Modal visible={showAuthorPicker} transparent animationType="fade">
        <TouchableOpacity activeOpacity={1} onPress={() => setShowAuthorPicker(false)} style={{ flex: 1, backgroundColor: "rgba(28,28,28,0.4)", justifyContent: "flex-end" }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: colors.offwhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 12, maxHeight: "60%" }}>
            <View style={{ alignItems: "center", paddingTop: 12, marginBottom: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, color: colors.dark, marginBottom: 16 }}>Select author</Text>
              <ScrollView>
                {allUsers.map((u: any) => (
                  <TouchableOpacity key={u.id} onPress={() => { setAuthorId(u.id); setAuthorName(u.name); setShowAuthorPicker(false); setDirty(true); }} style={{ height: 52, borderWidth: 1, borderColor: authorId === u.id ? colors.dark : colors.border, borderRadius: 10, backgroundColor: authorId === u.id ? colors.dark : colors.white, justifyContent: "center", paddingHorizontal: 16, marginBottom: 8 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: authorId === u.id ? colors.offwhite : colors.dark }}>{u.name || "Unnamed"}</Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: authorId === u.id ? "rgba(250,250,250,0.7)" : colors.warm }}>{u.email} · {u.role}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
