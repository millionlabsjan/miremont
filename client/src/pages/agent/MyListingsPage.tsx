import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, AlertTriangle, ArrowRight } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { clsx } from "clsx";

export default function MyListingsPage() {
  const queryClient = useQueryClient();

  const { data: listings } = useQuery({
    queryKey: ["my-listings"],
    queryFn: async () => {
      const res = await fetch("/api/properties/user/my-listings", { credentials: "include" });
      return res.json();
    },
  });

  const props = Array.isArray(listings) ? listings : [];
  const active = props.filter((p: any) => p.status === "active");
  const hidden = props.filter((p: any) => p.status === "delisted" || p.status === "inactive");
  const drafts = props.filter((p: any) => p.status === "draft");

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest(`/api/properties/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
  });

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl font-bold mb-6">My Listings</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active", value: active.length },
          { label: "Hidden", value: hidden.length },
          { label: "Drafts", value: drafts.length },
        ].map((stat) => (
          <div key={stat.label} className="border border-dashed border-brand-border rounded-xl p-6 bg-white">
            <p className="font-serif text-4xl font-bold">{stat.value}</p>
            <p className="text-sm text-brand-warm uppercase mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action cards */}
      <div className="space-y-3 mb-8">
        <div className="border border-brand-border rounded-xl p-5 bg-white flex items-center justify-between">
          <div>
            <p className="font-semibold">My listings</p>
            <p className="text-sm text-brand-warm">{active.length} active · {hidden.length} hidden · {drafts.length} drafts</p>
          </div>
          <span className="text-sm font-medium">View all →</span>
        </div>

        <Link to="/my-listings/new" className="border border-brand-border rounded-xl p-5 bg-white flex items-center justify-between hover:bg-brand-input transition-colors block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center">
              <Plus size={20} className="text-brand-offwhite" />
            </div>
            <div>
              <p className="font-semibold">Add new listing</p>
              <p className="text-sm text-brand-warm">List a new property on the platform</p>
            </div>
          </div>
          <span className="text-sm font-medium">Add listing →</span>
        </Link>

        {hidden.length > 0 && (
          <div className="border border-brand-border rounded-xl p-5 bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-input rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-brand-warm" />
              </div>
              <div>
                <p className="font-semibold">{hidden.length} listings hidden</p>
                <p className="text-sm text-brand-warm">Not updated in 30+ days. Review and re-list.</p>
              </div>
            </div>
            <span className="text-sm font-medium">Review →</span>
          </div>
        )}
      </div>

      {/* Recent listings */}
      <h2 className="font-serif text-xl font-bold mb-4 flex items-center justify-between">
        Recent listings
        <span className="text-sm font-medium text-brand-warm">See all →</span>
      </h2>

      <div className="space-y-3">
        {props.map((prop: any) => (
          <div key={prop.id} className="border border-brand-border rounded-xl p-4 bg-white flex items-center gap-4">
            <div className="w-20 h-16 rounded-lg bg-brand-input overflow-hidden shrink-0">
              {prop.images?.[0] && <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{prop.title}</p>
              <p className="text-xs text-brand-warm">{prop.city}, {prop.country}</p>
              <p className="font-serif font-bold mt-1">£{Number(prop.price).toLocaleString()}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={clsx(
                "text-xs border rounded-full px-3 py-1 font-medium",
                prop.status === "active" ? "border-green-300 text-green-700" : "border-brand-border text-brand-warm"
              )}>
                {prop.status === "active" ? "Active" : prop.status === "delisted" ? "Hidden" : prop.status}
              </span>
              <p className="text-xs text-brand-warm mt-2">
                Updated {new Date(prop.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
