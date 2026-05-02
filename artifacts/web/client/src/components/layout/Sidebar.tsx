import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  Compass,
  Activity,
  MessageCircle,
  User,
  FileText,
  Users,
  CreditCard,
  Building2,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { clsx } from "clsx";
import NotificationBell from "../NotificationBell";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Home", path: "/dashboard", icon: <Home size={18} /> },
  { label: "Explore", path: "/explore", icon: <Compass size={18} /> },
  { label: "Activity", path: "/activity", icon: <Activity size={18} /> },
  { label: "Chat", path: "/chat", icon: <MessageCircle size={18} /> },
  { label: "Account", path: "/account", icon: <User size={18} /> },
  {
    label: "My Plan",
    path: "/my-plan",
    icon: <CreditCard size={18} />,
    roles: ["agent"],
  },
  {
    label: "My Listings",
    path: "/my-listings",
    icon: <Building2 size={18} />,
    roles: ["agent"],
  },
  {
    label: "Overview",
    path: "/admin/users",
    icon: <BarChart3 size={18} />,
    roles: ["admin"],
  },
  {
    label: "Articles",
    path: "/news",
    icon: <FileText size={18} />,
  },
  {
    label: "Billing",
    path: "/billing",
    icon: <CreditCard size={18} />,
    roles: ["agent"],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role || "")
  );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-brand-dark flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 pt-7 pb-4">
        <h1 className="font-serif text-lg font-semibold text-brand-offwhite">
          The Property Catalogue
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col">
        {filteredItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors border-l-3",
                isActive
                  ? "bg-brand-offwhite text-brand-dark border-brand-offwhite font-bold"
                  : "text-brand-warm border-transparent hover:text-brand-offwhite hover:bg-white/5"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-brand-warm/30 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-border flex items-center justify-center shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-brand-dark">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-offwhite truncate">
              {user?.name}
            </p>
            <p className="text-xs text-brand-warm capitalize">
              {user?.role === "agent"
                ? user.agencyName || "Agent"
                : user?.role}
            </p>
          </div>
          <NotificationBell />
        </div>
        <button
          onClick={logout}
          className="text-sm text-brand-warm hover:text-brand-offwhite transition-colors flex items-center gap-2"
        >
          <LogOut size={14} />
          Log out
        </button>
      </div>
    </aside>
  );
}
