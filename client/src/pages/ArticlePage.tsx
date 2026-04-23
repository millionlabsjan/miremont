import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2 } from "lucide-react";

export default function ArticlePage() {
  const { slug } = useParams();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const res = await fetch(`/api/articles/by-slug/${slug}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 text-center text-brand-warm">Article not found</div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link
          to="/news"
          className="flex items-center gap-2 text-sm text-brand-dark hover:underline"
        >
          <ArrowLeft size={16} /> Back to articles
        </Link>
        <button className="flex items-center gap-2 text-sm text-brand-warm hover:text-brand-dark">
          <Share2 size={16} /> Share
        </button>
      </div>

      {/* Hero image */}
      {article.thumbnailUrl && (
        <div className="aspect-[16/9] rounded-xl overflow-hidden mb-8">
          <img
            src={article.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Category badge */}
      {article.category && (
        <span className="inline-block border border-brand-border rounded-full px-3 py-1 text-xs font-medium text-brand-warm mb-4">
          {article.category}
        </span>
      )}

      <h1 className="font-serif text-3xl font-bold text-brand-dark mb-4">
        {article.content?.titleEn || "Untitled"}
      </h1>

      {/* Author & date */}
      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-brand-border">
        <div className="w-10 h-10 rounded-full bg-brand-input" />
        <div>
          <p className="text-sm font-medium">{article.author?.name}</p>
          {article.publishedDate && (
            <p className="text-xs text-brand-warm">
              {new Date(article.publishedDate).toLocaleDateString("en-GB", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Article body */}
      <div
        className="prose prose-sm max-w-none text-brand-dark/80"
        dangerouslySetInnerHTML={{
          __html: article.content?.bodyEn || "<p>No content available.</p>",
        }}
      />
    </div>
  );
}
