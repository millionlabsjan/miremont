import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface Article {
  id: string;
  slug: string;
  category: string;
  thumbnailUrl: string | null;
  publishedDate: string;
  content: { titleEn: string; bodyEn: string } | null;
  author: { name: string; avatarUrl: string | null } | null;
}

export default function ArticlesPage() {
  const { data } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const res = await fetch("/api/articles", { credentials: "include" });
      return res.json();
    },
  });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-serif text-3xl font-bold mb-8">Articles</h1>

      <div className="space-y-4">
        {data?.articles?.map((article: Article) => (
          <Link
            key={article.id}
            to={`/news/${article.slug}`}
            className="block bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-4">
              <div className="w-[200px] h-[130px] rounded-lg bg-brand-input overflow-hidden shrink-0">
                {article.thumbnailUrl && (
                  <img
                    src={article.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                {article.category && (
                  <span className="text-[10px] font-semibold uppercase text-brand-warm tracking-wider">
                    {article.category}
                  </span>
                )}
                <h2 className="font-serif text-xl font-bold text-brand-dark mt-1">
                  {article.content?.titleEn || "Untitled"}
                </h2>
                <p className="text-sm text-brand-warm mt-2 line-clamp-2">
                  {article.content?.bodyEn?.replace(/<[^>]+>/g, "").slice(0, 150)}...
                </p>
                <p className="text-xs text-brand-warm mt-3">
                  {article.author?.name}
                  {article.publishedDate &&
                    ` \u00B7 ${new Date(article.publishedDate).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
