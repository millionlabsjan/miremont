import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Heart, Search, ArrowRight, Grid3X3, List } from "lucide-react";
import { useState } from "react";

export default function ActivityPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: favData } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/properties/user/favorites", { credentials: "include" });
      return res.json();
    },
  });

  const { data: searchData } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const res = await fetch("/api/searches", { credentials: "include" });
      return res.json();
    },
  });

  const favorites = Array.isArray(favData) ? favData : [];
  const searches = Array.isArray(searchData) ? searchData : [];

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="font-serif text-3xl font-bold mb-6">Activity</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Saved Properties", value: favorites.length },
          { label: "Saved Searches", value: searches.length },
          { label: "Unread Messages", value: 0 },
          { label: "New Listings Today", value: 0 },
        ].map((stat, i) => (
          <div key={i} className="border border-brand-border rounded-xl p-5 bg-white">
            <p className="text-[11px] font-semibold text-brand-warm uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="font-serif text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Saved Properties */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-xl font-bold">Saved Properties</h2>
          <p className="text-sm text-brand-warm">{favorites.length} saved properties</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-brand-dark text-white" : "text-brand-warm"}`}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-brand-dark text-white" : "text-brand-warm"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      <div className={`grid ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1"} gap-4 mb-8`}>
        {favorites.map((prop: any) => (
          <Link key={prop.id} to={`/properties/${prop.id}`} className="border border-brand-border rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] bg-brand-input relative">
              {prop.images?.[0] && <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />}
              {prop.categories?.[0] && (
                <span className="absolute bottom-2 left-2 bg-brand-dark text-brand-offwhite text-[10px] font-semibold px-2 py-0.5 rounded uppercase">{prop.categories[0]}</span>
              )}
              <button className="absolute top-2 right-2"><Heart size={18} className="fill-brand-dark text-brand-dark" /></button>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm truncate">{prop.title}</p>
              <p className="text-xs text-brand-warm">{prop.city}, {prop.country}</p>
              <p className="font-serif text-lg font-bold mt-1">£ {Number(prop.price).toLocaleString()}</p>
              <div className="flex gap-3 text-xs text-brand-warm mt-1">
                {prop.bedrooms && <span>🛏 {prop.bedrooms}</span>}
                {prop.bathrooms && <span>🚿 {prop.bathrooms}</span>}
                {prop.size && <span>📐 {prop.size}m²</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity + Saved Searches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-brand-border rounded-xl p-6 bg-white">
          <h2 className="font-serif text-xl font-bold mb-4">Recent activity</h2>
          {[
            { text: 'New property matches your search "Waterfront Manhattan"', time: "2 hours ago" },
            { text: "Price drop on 432 Park Avenue, New York", time: "5 hours ago" },
            { text: "New message from agent Sarah Mitchell", time: "1 day ago" },
            { text: "Viewing scheduled for tomorrow at 2:00 PM", time: "1 day ago" },
            { text: "3 new properties in Upper East Side", time: "2 days ago" },
          ].map((item, i) => (
            <div key={i} className="flex items-start justify-between text-sm gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-dark mt-2 shrink-0" />
                <p>{item.text}</p>
              </div>
              <span className="text-brand-warm text-xs whitespace-nowrap">{item.time}</span>
            </div>
          ))}
        </div>

        <div className="border border-brand-border rounded-xl p-6 bg-white">
          <h2 className="font-serif text-xl font-bold mb-4">Saved searches</h2>
          {searches.length === 0 ? (
            <p className="text-sm text-brand-warm">No saved searches yet</p>
          ) : (
            searches.map((s: any) => (
              <div key={s.id} className="border border-brand-border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-sm">{s.name || "Untitled"}</p>
                  <Link to="/explore" className="text-sm font-medium text-brand-accent">View →</Link>
                </div>
                {s.filters && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {Object.entries(s.filters).filter(([_, v]) => v).map(([k, v]) => (
                      <span key={k} className="text-xs px-2 py-1 border border-brand-border rounded-full text-brand-warm">{String(v)}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <Link to="/explore" className="text-sm font-medium flex items-center gap-1 mt-2">Browse all <ArrowRight size={14} /></Link>
        </div>
      </div>
    </div>
  );
}
