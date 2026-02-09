import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, requiredRole: "admin" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || "Login failed");
      }

      localStorage.setItem("token", data.accessToken);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/img/logoSummary.png"
              alt="Split Bill"
              className="h-12 w-auto"
            />
          </div>
        </div>

        {/* Card */}
        <div
          className="p-8 space-y-6"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1.2rem",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Login Admin
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Masuk untuk mengelola Split Bill
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail
                    className="h-5 w-5"
                    style={{ color: "var(--muted-foreground)" }}
                  />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm transition-all"
                  style={{
                    background: "var(--input)",
                    border: "1px solid var(--border)",
                    borderRadius: "calc(var(--radius) - 4px)",
                    color: "var(--foreground)",
                  }}
                  placeholder="admin@splitbill.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    className="h-5 w-5"
                    style={{ color: "var(--muted-foreground)" }}
                  />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm transition-all"
                  style={{
                    background: "var(--input)",
                    border: "1px solid var(--border)",
                    borderRadius: "calc(var(--radius) - 4px)",
                    color: "var(--foreground)",
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div
                className="px-4 py-3 text-sm rounded-lg"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "var(--destructive)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 font-semibold text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "calc(var(--radius) - 2px)",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
