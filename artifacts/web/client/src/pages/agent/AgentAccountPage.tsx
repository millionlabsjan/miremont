import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { clsx } from "clsx";
import { formatPrice } from "../../lib/formatPrice";

export default function AgentAccountPage() {
  const { user } = useAuth();

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

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Account</h1>
          <p className="text-brand-warm mt-1">Manage your profile, listings, and preferences.</p>
        </div>
        <button className="border border-brand-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-input">Edit profile</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-6">
        {/* Left: Profile + Plan */}
        <div className="space-y-4">
          <div className="border border-brand-border rounded-xl p-6 bg-white text-center">
            <div className="w-20 h-20 rounded-full bg-brand-input mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl font-bold">{initials}</span>
            </div>
            <p className="font-semibold text-lg">{user?.agencyName || user?.name}</p>
            <p className="text-sm text-brand-warm">{user?.email}</p>
            <span className="inline-block mt-2 border border-brand-accent text-brand-accent rounded-full px-3 py-1 text-xs font-semibold uppercase">Estate Agent</span>

            <div className="mt-4 text-left text-sm space-y-2">
              <div className="flex justify-between text-brand-warm">
                <span>Member since</span>
                <span className="font-medium text-brand-dark">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-brand-warm"><span>Language</span><span className="font-medium text-brand-dark">English</span></div>
              <div className="flex justify-between text-brand-warm"><span>Currency</span><span className="font-medium text-brand-dark">USD</span></div>
            </div>
            <button className="mt-4 text-sm font-medium">Edit profile details →</button>
          </div>

          {/* Current plan */}
          <div className="border border-dashed border-brand-border rounded-xl p-5 bg-white">
            <p className="text-[10px] font-semibold text-brand-warm uppercase tracking-wider">Current Plan</p>
            <p className="font-serif text-xl font-bold mt-1">Pro Plan</p>
            <p className="text-xs text-brand-warm">Renews 15 Feb 2026 · USD 89 / month</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["20 listings", "Chat support", "Analytics"].map((f) => (
                <span key={f} className="text-xs border border-brand-border rounded-full px-2 py-0.5 text-brand-warm">{f}</span>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <button className="w-full h-10 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-input">Manage plan</button>
              <button className="w-full h-10 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-input">Billing history</button>
            </div>
          </div>
        </div>

        {/* Middle: Recent listings */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-xl font-bold">Recent listings</h2>
            <Link to="/my-listings" className="text-sm font-medium text-brand-warm">See all →</Link>
          </div>

          <div className="space-y-3">
            {props.slice(0, 5).map((prop: any) => (
              <div key={prop.id} className="border border-brand-border rounded-xl p-4 bg-white flex items-center gap-4">
                <div className="w-20 h-16 rounded-lg bg-brand-input overflow-hidden shrink-0">
                  {prop.images?.[0] && <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{prop.title}</p>
                  <p className="text-xs text-brand-warm">{prop.city}, {prop.country}</p>
                  <p className="font-bold text-sm mt-1">{formatPrice(prop.price, prop.currency)}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={clsx(
                    "text-xs border rounded-full px-3 py-1",
                    prop.status === "active" ? "border-green-300 text-green-700" : "border-brand-border text-brand-warm"
                  )}>
                    {prop.status === "active" ? "Active" : "Hidden"}
                  </span>
                  <p className="text-xs text-brand-warm mt-1">Updated {new Date(prop.lastUpdated).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Settings */}
        <div className="border border-brand-border rounded-xl p-5 bg-white">
          <h3 className="font-semibold mb-4">Settings</h3>
          {[
            "Profile & agency details",
            "Notifications",
            "Language",
            "Currency",
            "Appearance",
            "Change password",
            "Privacy settings",
          ].map((item) => (
            <button key={item} className="w-full flex items-center justify-between py-3 border-b border-brand-border/50 text-sm hover:text-brand-dark">
              <span>{item}</span>
              <span className="text-brand-warm">›</span>
            </button>
          ))}
          <div className="mt-6 pt-4 border-t border-brand-border space-y-2">
            <button className="w-full text-left py-2 text-sm text-brand-warm hover:text-brand-dark">Log out</button>
            <button className="w-full text-left py-2 text-sm text-red-500 hover:text-red-700">Delete account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
