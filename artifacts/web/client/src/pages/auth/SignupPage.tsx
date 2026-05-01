import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { validatePassword, PASSWORD_RULES_HINT } from "../../../../shared/password";

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "buyer" as "buyer" | "agent",
    agencyName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwError = validatePassword(form.password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    try {
      await signup(
        form.email,
        form.password,
        form.name,
        form.role,
        form.role === "agent" ? form.agencyName : undefined
      );
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="flex min-h-screen">
      {/* Left: Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-dark overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80"
          alt="Luxury property"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="relative z-10 flex flex-col justify-between p-8 h-full">
          <h2 className="font-serif text-4xl font-bold text-brand-offwhite max-w-md mt-40">
            Join The Property Catalogue.
          </h2>
          <p className="text-brand-warm/60 text-sm">
            Trusted by leading agencies worldwide.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-20 bg-brand-offwhite">
        <div className="w-full max-w-[440px]">
          <h1 className="font-serif text-[34px] font-bold text-brand-dark leading-tight">
            Create account
          </h1>
          <p className="text-brand-warm text-[15px] mt-2 mb-8">
            Get started with The Property Catalogue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Role toggle */}
            <div className="flex gap-2 mb-2">
              {(["buyer", "agent"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => update("role", role)}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                    form.role === role
                      ? "bg-brand-dark text-brand-offwhite"
                      : "bg-brand-input border border-brand-border text-brand-warm"
                  }`}
                >
                  {role === "buyer" ? "Property Buyer" : "Estate Agent"}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">
                Full name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Your full name"
                className="w-full h-[52px] px-4 bg-brand-input border border-brand-border rounded-[10px] text-[15px] placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
                required
              />
            </div>

            {form.role === "agent" && (
              <div>
                <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">
                  Agency name
                </label>
                <input
                  type="text"
                  value={form.agencyName}
                  onChange={(e) => update("agencyName", e.target.value)}
                  placeholder="Your agency name"
                  className="w-full h-[52px] px-4 bg-brand-input border border-brand-border rounded-[10px] text-[15px] placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">
                Email address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="your@email.com"
                className="w-full h-[52px] px-4 bg-brand-input border border-brand-border rounded-[10px] text-[15px] placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder={PASSWORD_RULES_HINT}
                  className="w-full h-[52px] px-4 pr-12 bg-brand-input border border-brand-border rounded-[10px] text-[15px] placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-warm"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-brand-dark text-brand-offwhite text-[15px] font-semibold rounded-[10px] hover:bg-brand-dark/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-brand-warm">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="text-brand-dark font-semibold hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
