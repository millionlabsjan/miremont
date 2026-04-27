import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/queryClient";
import { clsx } from "clsx";

const FEATURES = ["Pool", "Gym", "Garage", "Sea view", "Garden", "Lift", "Concierge", "Parking", "Terrace", "Wine cellar"];

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", propertyType: "", description: "", address: "", country: "", city: "",
    size: "", bedrooms: 4, bathrooms: 3, yearBuilt: "",
    features: [] as string[], images: [] as string[],
    listingType: "sale", currency: "GBP", price: "", priceNegotiable: false, priceOnRequest: false,
    serviceCharge: "", groundRent: "", leaseDuration: "", councilTaxBand: "",
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const toggleFeature = (f: string) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter((x) => x !== f) : [...prev.features, f],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiRequest("/api/properties", {
        method: "POST",
        body: JSON.stringify({
          title: form.title, description: form.description, address: form.address,
          country: form.country, city: form.city,
          price: parseFloat(form.price) || 500000,
          currency: form.currency, size: parseFloat(form.size) || undefined,
          sizeUnit: "sqm", bedrooms: form.bedrooms, bathrooms: form.bathrooms,
          yearBuilt: parseInt(form.yearBuilt) || undefined,
          features: form.features, images: form.images,
        }),
      });
      navigate("/my-listings");
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const steps = [
    { num: 1, label: "Listing" },
    { num: 2, label: "Images" },
    { num: 3, label: "Pricing" },
  ];

  return (
    <div className="p-8 max-w-3xl">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold">
          {step === 1 ? "List Property" : step === 2 ? "Add Images" : "Pricing"}
        </h1>
        <button className="text-sm text-brand-warm hover:text-brand-dark">Save draft</button>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
              step > s.num ? "bg-brand-dark border-brand-dark text-white" :
              step === s.num ? "border-brand-dark text-brand-dark" : "border-brand-border text-brand-warm"
            )}>
              {step > s.num ? "✓" : s.num}
            </div>
            <span className="text-xs font-semibold uppercase text-brand-warm">{s.label}</span>
            {i < steps.length - 1 && <div className="w-16 h-px bg-brand-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Property Title</label>
            <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g., Modern Villa with Ocean View" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark/20" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the property in detail..." rows={5} className="w-full px-4 py-3 bg-white border border-brand-border rounded-lg text-sm focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Location</label>
              <input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Start typing an address" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Country</label>
              <input value={form.country} onChange={(e) => update("country", e.target.value)} className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Size in sqm</label>
              <input value={form.size} onChange={(e) => update("size", e.target.value)} placeholder="e.g., 450" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Bedrooms</label>
              <div className="flex items-center gap-2">
                <button onClick={() => update("bedrooms", Math.max(0, form.bedrooms - 1))} className="w-10 h-12 border border-brand-border rounded-lg text-lg">−</button>
                <span className="w-10 text-center font-semibold">{form.bedrooms}</span>
                <button onClick={() => update("bedrooms", form.bedrooms + 1)} className="w-10 h-12 border border-brand-border rounded-lg text-lg">+</button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Bathrooms</label>
              <div className="flex items-center gap-2">
                <button onClick={() => update("bathrooms", Math.max(0, form.bathrooms - 1))} className="w-10 h-12 border border-brand-border rounded-lg text-lg">−</button>
                <span className="w-10 text-center font-semibold">{form.bathrooms}</span>
                <button onClick={() => update("bathrooms", form.bathrooms + 1)} className="w-10 h-12 border border-brand-border rounded-lg text-lg">+</button>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Year Built</label>
            <input value={form.yearBuilt} onChange={(e) => update("yearBuilt", e.target.value)} placeholder="e.g., 2024" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Features / Amenities</label>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <button key={f} onClick={() => toggleFeature(f)} className={clsx(
                  "px-4 py-2 rounded-lg text-sm border transition-colors",
                  form.features.includes(f) ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-brand-border text-brand-warm hover:bg-brand-input"
                )}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => setStep(2)} className="h-12 px-8 bg-brand-dark text-brand-offwhite rounded-lg font-semibold text-sm hover:bg-brand-dark/90">
              Next: Add Images →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Images */}
      {step === 2 && (
        <div className="space-y-5">
          <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Property Photography</label>
          <div className="border-2 border-dashed border-brand-border rounded-xl p-12 text-center bg-white">
            <p className="text-brand-warm mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-brand-warm">JPG or PNG, maximum 10MB per file</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {form.images.map((img, i) => (
              <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-brand-input relative">
                <img src={img} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute bottom-2 left-2 bg-brand-dark text-white text-xs px-2 py-0.5 rounded">Cover Photo</span>}
              </div>
            ))}
          </div>
          <p className="text-sm text-brand-warm">{form.images.length} of 12 photos added</p>
          <p className="text-xs text-brand-warm">Add at least 5 high-quality photos to publish this. The first photo will be used as the cover image.</p>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="h-12 px-6 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-input">← Back to Details</button>
            <button onClick={() => setStep(3)} className="h-12 px-8 bg-brand-dark text-brand-offwhite rounded-lg font-semibold text-sm hover:bg-brand-dark/90">Next: Pricing →</button>
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">Listing Type</label>
            <div className="flex gap-2">
              {["sale", "rent", "leasehold"].map((t) => (
                <button key={t} onClick={() => update("listingType", t)} className={clsx(
                  "flex-1 h-12 rounded-lg text-sm font-medium capitalize border transition-colors",
                  form.listingType === t ? "bg-brand-dark text-white border-brand-dark" : "bg-white border-brand-border text-brand-warm"
                )}>For {t === "sale" ? "Sale" : t === "rent" ? "Rent" : "Leasehold"}</button>
              ))}
            </div>
          </div>
          <div className="border border-brand-border rounded-xl p-5 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select value={form.currency} onChange={(e) => update("currency", e.target.value)} className="w-full h-12 px-4 border border-brand-border rounded-lg text-sm">
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Price</label>
                <input value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="3,800,000" className="w-full h-12 px-4 border border-brand-border rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.priceNegotiable} onChange={(e) => update("priceNegotiable", e.target.checked)} /> Price is negotiable</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.priceOnRequest} onChange={(e) => update("priceOnRequest", e.target.checked)} /> Price on request (hide from listing)</label>
            </div>
          </div>
          <h2 className="font-serif text-xl font-bold">Additional fees</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Annual service charge</label>
              <input value={form.serviceCharge} onChange={(e) => update("serviceCharge", e.target.value)} placeholder="£ 12,500" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
              <p className="text-xs text-brand-warm mt-1">Annual charge for building maintenance and services</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Annual ground rent</label>
              <input value={form.groundRent} onChange={(e) => update("groundRent", e.target.value)} placeholder="£ 0" className="w-full h-12 px-4 bg-white border border-brand-border rounded-lg text-sm focus:outline-none" />
              <p className="text-xs text-brand-warm mt-1">For leasehold properties only</p>
            </div>
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="h-12 px-6 border border-brand-border rounded-lg text-sm font-medium hover:bg-brand-input">← Back to Images</button>
            <button onClick={handleSubmit} disabled={saving} className="h-12 px-8 bg-brand-dark text-brand-offwhite rounded-lg font-semibold text-sm hover:bg-brand-dark/90 disabled:opacity-50">
              {saving ? "Publishing..." : "List Property"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
