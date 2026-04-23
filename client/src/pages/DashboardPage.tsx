import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { Heart, Search, MessageCircle, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: string;
}) {
  return (
    <div className="border border-brand-border rounded-xl p-5 bg-white">
      <p className="text-[11px] font-semibold text-brand-warm uppercase tracking-wider mb-3">
        {label}
      </p>
      <p className="font-serif text-3xl font-bold text-brand-dark">{value}</p>
      {trend && (
        <p className="text-xs text-brand-warm mt-2 flex items-center gap-1">
          <TrendingUp size={12} />
          {trend}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // For now, return placeholder stats based on role
      if (user?.role === "admin") {
        return {
          stats: [
            { label: "Total Users", value: "1,284", trend: "12% vs last month" },
            { label: "Active Agents", value: "347", trend: "8% vs last month" },
            { label: "Live Listings", value: "892", trend: "15% vs last month" },
            { label: "App Downloads", value: "24,631", trend: "22% vs last month" },
            { label: "Monthly Active", value: "9,103", trend: "18% vs last month" },
          ],
        };
      }
      if (user?.role === "agent") {
        return {
          stats: [
            { label: "Active Listings", value: "12" },
            { label: "Total Inquiries", value: "47" },
            { label: "Unread Messages", value: "8" },
            { label: "Views This Month", value: "1,234" },
          ],
        };
      }
      return {
        stats: [
          { label: "Saved Properties", value: "28" },
          { label: "Saved Searches", value: "5" },
          { label: "Unread Messages", value: "3" },
          { label: "New Listings Today", value: "47" },
        ],
      };
    },
  });

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-brand-dark">
          {user?.role === "admin"
            ? "User Management"
            : user?.role === "agent"
            ? "Agent Dashboard"
            : "Welcome back"}
        </h1>
        {user?.role === "admin" && (
          <p className="text-brand-warm mt-1">
            Manage accounts, user status, and platform access.
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats?.stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="border border-brand-border rounded-xl p-6 bg-white">
          <h2 className="font-serif text-xl font-bold mb-4">Recent activity</h2>
          <div className="space-y-4">
            {[
              { text: 'New property matches your search "Waterfront Manhattan"', time: "2 hours ago" },
              { text: "Price drop on 432 Park Avenue, New York", time: "5 hours ago" },
              { text: "New message from agent Sarah Mitchell", time: "1 day ago" },
              { text: "Viewing scheduled for tomorrow at 2:00 PM", time: "1 day ago" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between text-sm gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-input shrink-0" />
                  <p className="text-brand-dark">{item.text}</p>
                </div>
                <span className="text-brand-warm text-xs whitespace-nowrap">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Searches (for buyers) or Quick Actions */}
        <div className="border border-brand-border rounded-xl p-6 bg-white">
          <h2 className="font-serif text-xl font-bold mb-4">
            {user?.role === "buyer" ? "Saved searches" : "Quick access"}
          </h2>
          {user?.role === "buyer" ? (
            <div className="space-y-4">
              {[
                { name: "Waterfront Manhattan", tags: ["3+ bed", "$2M-$5M", "Waterfront"] },
                { name: "Upper East Side", tags: ["2+ bed", "Doorman", "Renovated"] },
                { name: "Tribeca Lofts", tags: ["Open plan", "High ceilings"] },
              ].map((search, i) => (
                <div key={i}>
                  <p className="font-semibold text-sm text-brand-dark mb-1">
                    {search.name}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {search.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 border border-brand-border rounded-full text-brand-warm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <Link
                to="/explore"
                className="text-sm font-medium text-brand-dark flex items-center gap-1 mt-2"
              >
                Browse all <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "User Management", path: "/admin/users", icon: <Search size={16} /> },
                { label: "Articles", path: "/admin/articles", icon: <MessageCircle size={16} /> },
                { label: "Explore", path: "/explore", icon: <Heart size={16} /> },
              ].map((action) => (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-input transition-colors"
                >
                  <div className="flex items-center gap-3 text-sm text-brand-dark">
                    {action.icon}
                    {action.label}
                  </div>
                  <ArrowRight size={14} className="text-brand-warm" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
