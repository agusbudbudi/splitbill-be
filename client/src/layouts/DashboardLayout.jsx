import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Users, Star, Image, LogOut, Menu, X } from "lucide-react";

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

  const navItems = [
    { name: "Accounts", href: "/", icon: Users },
    { name: "Reviews", href: "/reviews", icon: Star },
    { name: "Banners", href: "/banners", icon: Image },
  ];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4">
            <img
              src="/img/logoSummary.png"
              alt="Split Bill"
              className="h-10 w-auto"
            />
            <button
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(false)}
              style={{ color: "var(--muted-foreground)" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center px-3 py-3 rounded-[8px] transition-all duration-200 group relative overflow-hidden"
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    color: isActive
                      ? "var(--primary)"
                      : "var(--muted-foreground)",
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? "var(--secondary)" : "transparent",
                  }}
                >
                  {isActive && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                      style={{ background: "var(--primary)" }}
                    />
                  )}
                  <item.icon
                    className={`w-5 h-5 mr-3 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                  />
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 rounded-[8px] transition-all duration-200"
              style={{
                color: "var(--destructive)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between h-16 px-6"
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            className="lg:hidden p-2"
            onClick={() => setSidebarOpen(true)}
            style={{ color: "var(--foreground)" }}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center ml-auto gap-3">
            <div className="text-right hidden sm:block">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {user.name || "Admin"}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {user.email || ""}
              </p>
            </div>
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {(user.name || "A")[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
