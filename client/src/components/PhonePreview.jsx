import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RotateCw, Signal, Wifi, BatteryFull, Lock } from "lucide-react";

// iPhone 15 / 16 CSS viewport
const SCREEN_WIDTH = 393;
const SCREEN_HEIGHT = 852;
const STATUS_BAR_HEIGHT = 54;
// Mobile Safari's bottom URL bar. Besides matching the real visible viewport,
// it keeps the iframe's square corners clear of the screen's rounded ones —
// Chrome won't clip an iframe layer to a scaled parent's border radius.
const SAFARI_BAR_HEIGHT = 74;
const WEB_HOST = "splitbill.my.id";
const BEZEL = 12;
const DEVICE_WIDTH = SCREEN_WIDTH + BEZEL * 2;
const DEVICE_HEIGHT = SCREEN_HEIGHT + BEZEL * 2;

const CMS_SOURCE = "splitbill-cms";
const PREVIEW_SOURCE = "splitbill-preview";
const SEND_DEBOUNCE_MS = 200;
const READY_TIMEOUT_MS = 12000;

// Origins the preview may legitimately announce itself from: the configured
// src's origin, plus its www/apex twin (the web may redirect between them).
// Anything else (the iframe navigated away) never receives unsaved drafts.
function allowedPreviewOrigins(src) {
  try {
    const { protocol, host } = new URL(src, window.location.href);
    const twin = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    return new Set([`${protocol}//${host}`, `${protocol}//${twin}`]);
  } catch {
    return new Set();
  }
}

/**
 * Renders splitbill-web's /preview/landing (the real homepage components) in an
 * iPhone-sized iframe and streams unsaved CMS content into it via postMessage.
 * At 393px wide the page's own mobile breakpoints apply, so what shows here is
 * what phones get after saving.
 */
/**
 * `topOffset` is the viewport y where the (sticky) preview starts, so the
 * device can shrink to fit the space left below it.
 */
export default function PhonePreview({ src, content, focusSection, topOffset = 92 }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const targetOriginRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [reloadKey, setReloadKey] = useState(0);

  // Fit the device to the column width and the viewport height.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const byWidth = el.clientWidth / DEVICE_WIDTH;
      // 48px: status row above the device + bottom breathing room
      const byHeight = (window.innerHeight - topOffset - 48) / DEVICE_HEIGHT;
      setScale(Math.max(0.4, Math.min(1, byWidth, byHeight)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [topOffset]);

  const post = (message) => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !targetOriginRef.current) return;
    win.postMessage({ source: CMS_SOURCE, ...message }, targetOriginRef.current);
  };

  // Handshake: the preview announces itself; its origin — if it is one of the
  // expected preview origins — becomes the only target content is posted to.
  useEffect(() => {
    targetOriginRef.current = null;
    const allowedOrigins = allowedPreviewOrigins(src);
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.source !== PREVIEW_SOURCE || event.data?.type !== "landing:ready") return;
      if (!allowedOrigins.has(event.origin)) {
        // Otherwise a preview URL that redirects elsewhere only shows up as a
        // generic "failed" after the ready timeout
        console.warn(`Landing preview: ignored ready message from unexpected origin ${event.origin}`);
        return;
      }
      targetOriginRef.current = event.origin;
      setStatus("ready");
    };
    window.addEventListener("message", onMessage);
    const timeout = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "failed" : s));
    }, READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };
  }, [reloadKey, src]);

  useEffect(() => {
    if (status !== "ready") return;
    const t = setTimeout(() => post({ type: "landing:content", content }), SEND_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [content, status]);

  useEffect(() => {
    if (status !== "ready" || !focusSection) return;
    // After the content post above, so the target section has its new height.
    const t = setTimeout(() => post({ type: "landing:focus", section: focusSection }), SEND_DEBOUNCE_MS + 100);
    return () => clearTimeout(t);
  }, [focusSection, status]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {status === "ready" ? "Live preview · belum disimpan" : status === "failed" ? "Preview gagal dimuat" : "Memuat preview..."}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            setReloadKey((k) => k + 1);
          }}
          className="p-1.5 rounded-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Muat ulang preview"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scaled device; the outer box reserves the scaled height. */}
      <div className="mx-auto" style={{ width: DEVICE_WIDTH * scale, height: DEVICE_HEIGHT * scale }}>
        <div
          className="relative origin-top-left"
          style={{ width: DEVICE_WIDTH, height: DEVICE_HEIGHT, transform: `scale(${scale})` }}
        >
          {/* Side buttons */}
          <span className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-[#2a2a2e]" />
          <span className="absolute -left-[3px] top-[180px] h-14 w-[3px] rounded-l bg-[#2a2a2e]" />
          <span className="absolute -left-[3px] top-[250px] h-14 w-[3px] rounded-l bg-[#2a2a2e]" />
          <span className="absolute -right-[3px] top-[200px] h-20 w-[3px] rounded-r bg-[#2a2a2e]" />

          {/* Body */}
          <div
            className="absolute inset-0 rounded-[64px] bg-[#1c1c1f] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/40"
            style={{ padding: BEZEL }}
          >
            {/* Screen */}
            <div className="relative h-full w-full overflow-hidden rounded-[52px] bg-white">
              {/* Status bar */}
              <div
                className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-9 bg-white text-black"
                style={{ height: STATUS_BAR_HEIGHT }}
              >
                <span className="text-[16px] font-semibold tracking-tight">9:41</span>
                <span className="flex items-center gap-1.5">
                  <Signal className="h-4 w-4" strokeWidth={2.5} />
                  <Wifi className="h-4 w-4" strokeWidth={2.5} />
                  <BatteryFull className="h-5 w-5" strokeWidth={2} />
                </span>
              </div>
              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-[11px] z-30 h-[35px] w-[124px] -translate-x-1/2 rounded-full bg-black" />

              <iframe
                key={reloadKey}
                ref={iframeRef}
                src={src}
                title="Preview landing page"
                className="absolute left-0 border-0 bg-white"
                style={{
                  top: STATUS_BAR_HEIGHT,
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT - STATUS_BAR_HEIGHT - SAFARI_BAR_HEIGHT,
                }}
              />

              {status !== "ready" && (
                <div
                  className="absolute inset-x-0 z-10 flex items-center justify-center bg-white p-8 text-center"
                  style={{ top: STATUS_BAR_HEIGHT, bottom: SAFARI_BAR_HEIGHT }}
                >
                  {status === "failed" ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-800">Preview tidak tersambung</p>
                      <p className="text-xs text-slate-500">
                        Pastikan splitbill-web di URL ini sudah punya route /preview/landing (lokal: restart next dev; prod: deploy dulu)
                        dan origin admin ini ada di NEXT_PUBLIC_CMS_ORIGINS. URL bisa diganti lewat VITE_LANDING_PREVIEW_URL.
                      </p>
                      <p className="text-[11px] text-slate-400 break-all">{src}</p>
                    </div>
                  ) : (
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                </div>
              )}

              {/* Safari URL bar */}
              <div
                className="absolute inset-x-0 bottom-0 z-20 border-t border-black/5 bg-[#f6f6f8] px-4 pt-2"
                style={{ height: SAFARI_BAR_HEIGHT }}
              >
                <div className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-[15px] text-black shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                  <Lock className="h-3.5 w-3.5 text-black/50" strokeWidth={2.5} />
                  {WEB_HOST}
                </div>
              </div>

              {/* Home indicator */}
              <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-black/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
