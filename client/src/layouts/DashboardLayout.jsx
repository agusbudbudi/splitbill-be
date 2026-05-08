import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  Star,
  Image,
  LogOut,
  Menu,
  X,
  Receipt,
  Package,
  BarChart2,
  ShoppingBag,
  Mail,
} from "lucide-react";
import { ToastProvider } from "../components/ui";

const navGroups = [
  {
    title: "Analitik & Bisnis",
    items: [
      { name: "Insight", href: "/insights", icon: BarChart2 },
      { name: "Orders", href: "/orders", icon: ShoppingBag },
      { name: "Split Bill", href: "/split-bills", icon: Receipt },
    ],
  },
  {
    title: "Manajemen Pengguna",
    items: [
      { name: "Akun Pengguna", href: "/", icon: Users },
      { name: "Reviews", href: "/reviews", icon: Star },
    ],
  },
  {
    title: "Operasional & Konten",
    items: [
      { name: "Campaigns", href: "/campaigns", icon: Mail },
      { name: "Banners", href: "/banners", icon: Image },
      { name: "Subscription", href: "/subscription-packages", icon: Package },
    ],
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-56 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 bg-white border-r border-border ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 flex-shrink-0 border-b border-border">
            <div className="flex items-center gap-2">
              <img
                src="/img/logoSummary.png"
                alt="Split Bill"
                className="h-8 w-auto"
              />
              <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider">
                New
              </span>
            </div>
            <button
              className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? location.pathname === "/"
                        : location.pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold transition-all duration-150 group ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon
                          className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 flex-shrink-0 border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all duration-150"
            >
              <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header
            className="flex items-center justify-between h-16 px-6 flex-shrink-0 bg-white"
            style={{
              borderBottom: "1px solid var(--border)",
              boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04)",
            }}
          >
            <button
              className="lg:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center ml-auto gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {user.name || "Admin"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.email || ""}
                </p>
              </div>
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: "var(--primary)", color: "white" }}
              >
                {(user.name || "A")[0].toUpperCase()}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
