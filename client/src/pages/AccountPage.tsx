import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { clsx } from "clsx";

export default function AccountPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiRequest("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify({ name, email }),
      });
      setMessage("Profile updated");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message);
    }
    setSaving(false);
  };

  const changePassword = async () => {
    setSaving(true);
    try {
      await apiRequest("/api/users/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.message);
    }
    setSaving(false);
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const tabs = ["profile", "security", "notifications"];
  if (user?.role === "admin") tabs.push("permissions");

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl font-bold mb-2">My Account</h1>
      <p className="text-brand-warm mb-8">
        Manage your profile, security, and platform preferences.
      </p>

      {message && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
        {/* Left: Profile Card */}
        <div className="border border-brand-border rounded-xl p-6 bg-white text-center">
          <div className="w-20 h-20 rounded-full bg-brand-input mx-auto mb-4 flex items-center justify-center">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-brand-dark">
                {initials}
              </span>
            )}
          </div>
          <p className="font-semibold text-lg">{user?.name}</p>
          <p className="text-sm text-brand-warm capitalize">{user?.role}</p>
          <p className="text-xs text-brand-warm mt-1">{user?.email}</p>

          <span className="inline-block mt-3 border border-brand-dark rounded-full px-3 py-1 text-xs font-semibold uppercase">
            {user?.role}
          </span>

          <div className="mt-4 text-left space-y-2 text-sm">
            <div className="flex justify-between text-brand-warm">
              <span>Member since</span>
              <span className="font-medium text-brand-dark">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
          </div>

          <button className="mt-4 text-sm text-brand-dark font-medium hover:underline">
            Edit profile &rarr;
          </button>
        </div>

        {/* Middle: Main content based on tab */}
        <div className="border border-brand-border rounded-xl p-6 bg-white">
          {/* Profile tab */}
          <h2 className="font-serif text-xl font-bold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="bg-brand-dark text-brand-offwhite px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-dark/90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>

          <div className="border-t border-brand-border mt-6 pt-6">
            <h2 className="font-serif text-xl font-bold mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase mb-2">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 px-4 bg-brand-input border border-brand-border rounded-lg text-sm focus:outline-none"
                  minLength={8}
                />
              </div>
              <button
                onClick={changePassword}
                disabled={saving || !currentPassword || !newPassword}
                className="bg-brand-dark text-brand-offwhite px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-dark/90 disabled:opacity-50"
              >
                Update password
              </button>
            </div>
          </div>
        </div>

        {/* Right: Security & Notifications */}
        <div className="space-y-4">
          <div className="border border-brand-border rounded-xl p-5 bg-white">
            <h3 className="font-semibold mb-3">Security</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-xs text-brand-warm">Last changed 3 months ago</p>
                </div>
                <span className="text-brand-dark text-xs font-medium">Change &rarr;</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-factor auth</p>
                  <p className="text-xs text-brand-warm">Authenticator app</p>
                </div>
                <div className="w-10 h-6 bg-brand-dark rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {user?.role === "admin" && (
            <div className="border border-brand-border rounded-xl p-5 bg-white">
              <h3 className="font-semibold mb-3">Permissions</h3>
              <div className="space-y-2 text-sm">
                {["User Management", "Article Management", "Plan Management", "Platform Settings"].map(
                  (perm) => (
                    <div key={perm} className="flex items-center justify-between">
                      <span>{perm}</span>
                      <span className="bg-brand-dark text-brand-offwhite text-[10px] font-bold px-2 py-0.5 rounded">
                        FULL ACCESS
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="border border-brand-border rounded-xl p-5 bg-white">
            <h3 className="font-semibold mb-3">Notifications</h3>
            <div className="space-y-3 text-sm">
              {[
                "New user registrations",
                "Flagged accounts",
                "Failed payments",
                "Stale listing alerts",
                "System errors",
              ].map((notif) => (
                <div key={notif} className="flex items-center justify-between">
                  <span>{notif}</span>
                  <div className="w-10 h-6 bg-brand-dark rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
