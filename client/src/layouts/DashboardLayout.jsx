import { useState, useEffect, useRef } from "react";
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
  FileText,
  Bell,
  ChevronRight,
  Megaphone,
} from "lucide-react";
import { ToastProvider, Avatar } from "../components/ui";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

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
      { name: "Users", href: "/users", icon: Users },
      { name: "Reviews", href: "/reviews", icon: Star },
    ],
  },
  {
    title: "Operasional & Konten",
    items: [
      { name: "Campaigns", href: "/campaigns", icon: Mail },
      { name: "Ad Campaigns", href: "/ad-campaigns", icon: Megaphone },
      { name: "Blog", href: "/blogs", icon: FileText },
      { name: "Banners", href: "/banners", icon: Image },
      { name: "Subscription", href: "/subscription-packages", icon: Package },
    ],
  },
];

const breadcrumbLabels = {
  "split-bills": "Split Bill",
  "orders": "Orders",
  "users": "Users",
  "subscription-packages": "Subscription Packages",
  "insights": "Insight",
  "campaigns": "Campaigns",
  "ad-campaigns": "Ad Campaigns",
  "blogs": "Blog",
  "banners": "Banners",
  "reviews": "Reviews",
  "new": "Tulis Baru",
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const res = await apiFetch("/api/insights");
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setKpis(result.data.kpis);
          }
        }
      } catch (err) {
        console.error("Failed to fetch KPIs for DashboardLayout", err);
      }
    };
    fetchKpis();

    // Refresh every 5 minutes
    const interval = setInterval(fetchKpis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split("/").filter((x) => x);
    if (pathnames.length === 0) {
      return [{ name: "Akun Pengguna", href: "/" }];
    }

    const crumbs = [{ name: "Dashboard", href: "/" }];
    let currentPath = "";

    pathnames.forEach((segment, index) => {
      currentPath += `/${segment}`;
      let name = breadcrumbLabels[segment] || segment;

      if (index > 0 && !breadcrumbLabels[segment]) {
        const parent = pathnames[index - 1];
        if (parent === "split-bills") name = "Detail Split Bill";
        else if (parent === "orders") name = "Detail Order";
        else if (parent === "users") name = "Detail Pengguna";
        else if (parent === "campaigns") name = "Detail Campaign";
        else if (parent === "blogs") name = "Edit Blog";
      }
      crumbs.push({ name, href: currentPath });
    });

    return crumbs;
  };

  const alerts = [];
  if (kpis?.pendingOrders > 0) {
    alerts.push({
      id: "pending-orders",
      title: "Pending Orders",
      message: `Ada ${kpis.pendingOrders} order pending yang membutuhkan perhatian.`,
      href: "/orders",
      type: "warning",
    });
  }
  if (kpis?.expiredSubscribers > 0) {
    alerts.push({
      id: "expired-subscribers",
      title: "Subscription Expired",
      message: `Ada ${kpis.expiredSubscribers} pelanggan dengan status langganan kedaluwarsa.`,
      href: "/insights",
      type: "info",
    });
  }

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
          className={`fixed inset-y-0 left-0 z-30 w-56 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 bg-white border-r border-border ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 flex-shrink-0 border-b border-border relative">
            <div className="flex items-center justify-center gap-2">
              <img
                src="/img/logoSummary.png"
                alt="Split Bill"
                className="h-8 w-auto"
              />
            </div>
            <button
              className="absolute right-4 lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold transition-all duration-150 group ${isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                      >
                        <item.icon
                          className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                            }`}
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.name === "Orders" && kpis?.pendingOrders > 0 && (
                          <span className="bg-destructive/10 text-destructive text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {kpis.pendingOrders}
                          </span>
                        )}
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
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} />
              </button>

              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {getBreadcrumbs().map((crumb, idx) => {
                  const isLast = idx === getBreadcrumbs().length - 1;
                  return (
                    <div key={crumb.href} className="flex items-center gap-1.5">
                      {idx > 0 && <ChevronRight size={14} className="text-muted-foreground/30" />}
                      {isLast ? (
                        <span className="text-foreground font-semibold">{crumb.name}</span>
                      ) : (
                        <Link to={crumb.href} className="hover:text-foreground transition-colors">
                          {crumb.name}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center ml-auto gap-4">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
                >
                  <Bell size={20} />
                  {alerts.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-white animate-pulse" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-border shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-border">
                      <h4 className="font-semibold text-sm text-foreground">Notifikasi & Alert</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                          Tidak ada notifikasi baru
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <Link
                            key={alert.id}
                            to={alert.href}
                            onClick={() => setNotifOpen(false)}
                            className="block px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-b-0 transition-colors"
                          >
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${alert.type === "warning" ? "bg-warning" : "bg-primary"}`} />
                              {alert.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                              {alert.message}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {user.name || "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email || ""}
                  </p>
                </div>
                <Avatar
                  name={user.name || "Admin"}
                  src={user.image || user.avatar}
                  size="md"
                />
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

