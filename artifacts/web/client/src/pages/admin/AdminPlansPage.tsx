import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, ArrowLeft } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { clsx } from "clsx";

const PLAN_FEATURES = ["Pool", "Chat support", "Analytics", "Priority search", "Custom branding", "Team seats"];

export default function AdminPlansPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["user-detail", userId],
    queryFn: async () => {
      const res = await fetch(`/api/users?search=&page=1&limit=100`, { credentials: "include" });
      const data = await res.json();
      return data.users?.find((u: any) => u.id === userId);
    },
  });

  const [form, setForm] = useState({
    planName: "",
    listingSlots: 10,
    planExpiry: "",
    features: ["Chat support"] as string[],
    internalNotes: "",
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const toggleFeature = (f: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter((x) => x !== f) : [...prev.features, f],
    }));
  };

  // Determine state: "no_plan", "custom", "stripe"
  // TODO: derive from user subscription data
  const planState = "no_plan" as string;

  const initials = userData?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const saveMutation = useMutation({
    mutationFn: async () => {
      // For now, just show the UI
      alert("Plan saved (placeholder)");
    },
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-brand-warm mb-2">
        <button onClick={() => navigate(-1)} className="hover:text-brand-dark flex items-center gap-1">
          <ArrowLeft size={14} /> User Management
        </button>
        <span>›</span>
        <span>Plan Management</span>
      </div>

      <h1 className="font-serif text-3xl font-bold mb-2">Plan Management</h1>
      <p className="text-brand-warm mb-6">Assign or adjust custom subscription values.</p>

      {/* User card */}
      <div className="border border-brand-border rounded-xl p-5 bg-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-input flex items-center justify-center">
            <span className="font-semibold text-sm">{initials}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{userData?.name || "Loading..."}</p>
              <span className="text-xs border border-brand-border rounded px-2 py-0.5 uppercase">{userData?.role}</span>
            </div>
            <p className="text-sm text-brand-warm">{userData?.email}</p>
          </div>
          <span className={clsx(
            "text-xs border rounded-full px-3 py-1 font-medium",
            planState === "stripe" ? "border-green-300 text-green-700" :
            planState === "custom" ? "border-brand-dark text-brand-dark" : "border-brand-border text-brand-warm"
          )}>
            {planState === "stripe" ? "Stripe Active" : planState === "custom" ? "Custom Plan" : "No Plan"}
          </span>
        </div>
      </div>

      {/* Stripe locked state */}
      {planState === "stripe" && (
        <>
          <div className="border border-brand-border rounded-xl p-5 bg-brand-input mb-6 flex items-start gap-3">
            <Lock size={20} className="text-brand-warm shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Plan editing unavailable</p>
              <p className="text-sm text-brand-warm">This user has an active Stripe subscription. Editing is disabled until they cancel through Stripe.</p>
            </div>
          </div>
          <h2 className="font-serif text-xl font-bold mb-4">Current Stripe Plan</h2>
          <div className="border border-brand-border rounded-xl overflow-hidden bg-white">
            {[
              { label: "Plan Name", value: "Pro" },
              { label: "Listing Slots", value: "20" },
              { label: "Billing Cycle", value: "Monthly" },
              { label: "Renewal", value: "15 Feb 2026" },
              { label: "Stripe ID", value: "cus_••••4242" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between px-5 py-3 border-b border-brand-border/50 last:border-0">
                <span className="text-sm text-brand-warm">{row.label}</span>
                <span className="text-sm font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Assign / Edit plan */}
      {planState !== "stripe" && (
        <>
          <div className="border border-brand-border rounded-xl p-5 bg-white mb-6">
            <p className="font-semibold text-sm">
              {planState === "custom" ? "Edit custom plan" : "Assign a custom plan"}
            </p>
            <p className="text-sm text-brand-warm">
              {planState === "custom"
                ? "Changes take effect immediately. Last updated 10 Jan 2026."
                : "This user has no subscription. Configure values below. Collect payment off-platform."}
            </p>
          </div>

          <h2 className="font-serif text-xl font-bold mb-4">Plan Configuration</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Plan Name</label>
              <input value={form.planName} onChange={(e) => update("planName", e.target.value)} placeholder="e.g. Custom Agency Pro" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Listing Slots</label>
              <div className="flex items-center gap-3">
                <button onClick={() => update("listingSlots", Math.max(1, form.listingSlots - 1))} className="w-10 h-10 border border-brand-border rounded-lg text-lg">−</button>
                <span className="w-12 text-center font-semibold text-lg">{form.listingSlots}</span>
                <button onClick={() => update("listingSlots", form.listingSlots + 1)} className="w-10 h-10 border border-brand-border rounded-lg text-lg">+</button>
              </div>
              <p className="text-xs text-brand-warm mt-1">Number of active listings this user can have.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Plan Expiry</label>
              <input type="date" value={form.planExpiry} onChange={(e) => update("planExpiry", e.target.value)} className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
              <p className="text-xs text-brand-warm mt-1">Leave blank for no expiry.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Features Included</label>
              <div className="flex flex-wrap gap-2">
                {PLAN_FEATURES.map((f) => (
                  <button key={f} onClick={() => toggleFeature(f)} className={clsx(
                    "px-4 py-2 rounded-full text-sm border transition-colors",
                    form.features.includes(f) ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-brand-border text-brand-warm"
                  )}>{f}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Internal Notes</label>
              <textarea value={form.internalNotes} onChange={(e) => update("internalNotes", e.target.value)} placeholder="Payment terms, notes..." rows={4} className="w-full px-4 py-3 bg-white border border-brand-border rounded-lg text-sm focus:outline-none resize-none" />
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => navigate(-1)} className="h-12 px-6 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-input">Cancel</button>
              <button onClick={() => saveMutation.mutate()} className="h-12 px-8 bg-brand-dark text-brand-offwhite rounded-lg font-semibold text-sm hover:bg-brand-dark/90">Save changes</button>
            </div>

            {planState === "custom" && (
              <button className="text-sm text-red-500 hover:text-red-700 mt-2">Remove custom plan</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
