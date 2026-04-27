import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreVertical, X } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { clsx } from "clsx";

interface Article {
  id: string;
  slug: string;
  status: string;
  category: string;
  thumbnailUrl: string | null;
  publishedDate: string | null;
  content: {
    titleEn: string;
    bodyEn: string;
  } | null;
  author: { name: string } | null;
}

export default function AdminArticlesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState({
    slug: "",
    category: "",
    titleEn: "",
    bodyEn: "",
    thumbnailUrl: "",
  });

  const { data } = useQuery({
    queryKey: ["admin-articles", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/articles?${params}`, { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/articles", {
        method: "POST",
        body: JSON.stringify(form),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      setShowModal(false);
      setForm({ slug: "", category: "", titleEn: "", bodyEn: "", thumbnailUrl: "" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest(`/api/articles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/articles/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const filters = ["all", "published", "draft", "archived"];

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold">Articles</h1>
        <button
          onClick={() => {
            setEditingArticle(null);
            setForm({ slug: "", category: "", titleEn: "", bodyEn: "", thumbnailUrl: "" });
            setShowModal(true);
          }}
          className="w-10 h-10 bg-brand-dark text-brand-offwhite rounded-full flex items-center justify-center hover:bg-brand-dark/90"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors",
              filter === f
                ? "bg-brand-dark text-brand-offwhite"
                : "bg-white border border-brand-border text-brand-warm hover:bg-brand-input"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Article list */}
      <div className="space-y-3">
        {data?.articles?.map((article: Article) => (
          <div
            key={article.id}
            className="bg-white border border-brand-border rounded-xl p-4 flex gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-[160px] h-[100px] rounded-lg bg-brand-input overflow-hidden shrink-0">
              {article.thumbnailUrl && (
                <img
                  src={article.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-lg font-bold text-brand-dark truncate">
                {article.content?.titleEn || "Untitled"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={clsx(
                    "text-xs font-medium border rounded-full px-2 py-0.5",
                    article.status === "published"
                      ? "border-green-300 text-green-700 bg-green-50"
                      : article.status === "draft"
                      ? "border-brand-border text-brand-warm"
                      : "border-orange-300 text-orange-700"
                  )}
                >
                  {article.status}
                </span>
              </div>
              <p className="text-sm text-brand-warm mt-1">
                {article.author?.name}
                {article.publishedDate &&
                  ` \u00B7 ${new Date(article.publishedDate).toLocaleDateString("en-GB", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}`}
              </p>
            </div>
            <div className="relative group">
              <button className="text-brand-warm hover:text-brand-dark p-1">
                <MoreVertical size={18} />
              </button>
              <div className="absolute right-0 top-8 bg-white border border-brand-border rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[140px]">
                {article.status === "draft" && (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: article.id,
                        status: "published",
                      })
                    }
                    className="w-full text-left px-4 py-2 text-sm hover:bg-brand-offwhite"
                  >
                    Publish
                  </button>
                )}
                {article.status === "published" && (
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: article.id,
                        status: "archived",
                      })
                    }
                    className="w-full text-left px-4 py-2 text-sm hover:bg-brand-offwhite"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(article.id)}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-brand-border">
              <h2 className="font-serif text-xl font-bold">
                {editingArticle ? "Edit Article" : "New Article"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-brand-warm hover:text-brand-dark"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                  Title (English)
                </label>
                <input
                  type="text"
                  value={form.titleEn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, titleEn: e.target.value }))
                  }
                  className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
                  placeholder="Article title"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
                  placeholder="article-slug"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. Luxury Trends"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                  Content (English)
                </label>
                <textarea
                  value={form.bodyEn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bodyEn: e.target.value }))
                  }
                  rows={8}
                  className="w-full px-4 py-3 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none resize-none"
                  placeholder="Write your article content..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-brand-border flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 text-sm font-medium border border-brand-border rounded-lg hover:bg-brand-input"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="px-6 py-2 text-sm font-semibold bg-brand-dark text-brand-offwhite rounded-lg hover:bg-brand-dark/90 disabled:opacity-50"
              >
                {createMutation.isPending ? "Saving..." : "Save Article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
