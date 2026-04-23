import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-dark overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80"
          alt="Luxury property"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="relative z-10 flex flex-col justify-between p-8 h-full">
          <h2 className="font-serif text-4xl font-bold text-brand-offwhite max-w-md mt-40">
            Find Your Next Luxury Property.
          </h2>
          <div>
            <p className="text-brand-warm text-base max-w-sm mb-8">
              Connecting discerning buyers with the world&apos;s finest
              properties.
            </p>
            <p className="text-brand-warm/60 text-sm">
              Trusted by leading agencies worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 lg:px-20 bg-brand-offwhite">
        <div className="w-full max-w-[440px]">
          <h1 className="font-serif text-[34px] font-bold text-brand-dark leading-tight">
            Welcome back
          </h1>
          <p className="text-brand-warm text-[15px] mt-2 mb-10">
            Sign in to your account to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-brand-warm uppercase tracking-wide mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-[52px] px-4 bg-brand-input border border-brand-border rounded-[10px] text-[15px] text-brand-dark placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-[52px] px-4 pr-12 bg-brand-input border border-brand-border rounded-[10px] text-[15px] text-brand-dark placeholder:text-brand-warm focus:outline-none focus:ring-2 focus:ring-brand-dark/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-warm hover:text-brand-dark"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/auth/reset-password"
                className="text-[13px] text-brand-warm hover:text-brand-dark"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-brand-dark text-brand-offwhite text-[15px] font-semibold rounded-[10px] hover:bg-brand-dark/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-brand-border" />
              <span className="text-[13px] text-brand-warm">or</span>
              <div className="flex-1 h-px bg-brand-border" />
            </div>

            <button
              type="button"
              className="w-full h-[52px] bg-brand-offwhite border border-brand-border rounded-[10px] text-[14px] font-semibold text-brand-dark hover:bg-brand-input transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-brand-warm">
            Don&apos;t have an account?{" "}
            <Link
              to="/auth/signup"
              className="text-brand-dark font-semibold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
