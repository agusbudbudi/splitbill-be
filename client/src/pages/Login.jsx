import { useState } from "react";
import { usePageMeta } from "../lib/usePageMeta";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui";

export default function Login() {
  usePageMeta("Login", "Masuk ke dashboard admin Split Bill.");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

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

      login(data.accessToken, data.user || {});

      navigate("/insights");
    } catch (err) {
      setError(err.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <aside className="hidden lg:flex flex-col gap-16 p-12 bg-primary text-primary-foreground">
        <img
          src="/split-bill-logo-white.png"
          alt="Split Bill"
          className="h-12 w-auto self-start"
        />

        <div className="max-w-md space-y-3">
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Dashboard admin Split Bill
          </h1>
          <p className="text-base text-white/80">
            Kelola pengguna, pesanan, dan konten aplikasi.
          </p>
        </div>

        <p className="mt-auto text-xs text-white/70">
          © {new Date().getFullYear()} Split Bill
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo (brand panel is hidden below lg) */}
          <div className="flex justify-center lg:hidden">
            <img
              src="/img/split-bill-logo-basic.png"
              alt="Split Bill"
              className="h-10 w-auto"
            />
          </div>

          <div className="bg-white rounded-sm shadow-soft border border-border p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                Selamat datang kembali
              </h2>
              <p className="text-sm text-muted-foreground">
                Masuk dengan akun admin untuk mengakses dashboard.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                id="email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                required
                placeholder="admin@splitbill.com"
                leftIcon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={<span className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  className="absolute bottom-0 right-0 h-[38px] w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 text-sm rounded-xs border border-destructive/20 bg-destructive/10 text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="flex items-start gap-2 rounded-xs bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <p>
                Halaman ini khusus admin. Akun pengguna biasa tidak dapat masuk
                ke dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
