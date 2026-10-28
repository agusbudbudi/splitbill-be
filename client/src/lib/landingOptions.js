import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Camera,
  CheckCircle,
  Clock,
  CreditCard,
  Gift,
  Heart,
  Lock,
  MessageCircle,
  PiggyBank,
  Plane,
  Receipt,
  ScanLine,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";

// Icons the landing page can render. Must match LANDING_ICONS in
// lib/landingPage.js (server validation) and the icon map in splitbill-web.
export const LANDING_ICON_MAP = {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Camera,
  CheckCircle,
  Clock,
  CreditCard,
  Gift,
  Heart,
  Lock,
  MessageCircle,
  PiggyBank,
  Plane,
  Receipt,
  ScanLine,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Wallet,
  Zap,
};

// Swatches for the admin picker only; splitbill-web owns the real classes.
export const LANDING_TONES = [
  { value: "primary", label: "Primary", color: "#479fea" },
  { value: "blue", label: "Blue", color: "#3b82f6" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "green", label: "Green", color: "#2ec866" },
  { value: "rose", label: "Rose", color: "#f43f5e" },
  { value: "violet", label: "Violet", color: "#8b5cf6" },
  { value: "purple", label: "Purple", color: "#a855f7" },
];

// Default images live in splitbill-web's /public, so previews of "/img/..."
// paths have to load from the web origin. Uploaded assets ("/api/...") are
// served by this backend and load as-is.
const WEB_ORIGIN = "https://www.splitbill.my.id";

export function resolvePreviewUrl(url) {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;
  if (url.startsWith("/")) return `${WEB_ORIGIN}${url}`;
  return url;
}
