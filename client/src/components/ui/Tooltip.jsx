import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

/**
 * A Portal-based tooltip component to avoid clipping issues with sidebars or overflow containers.
 * @param {Object} props
 * @param {React.ReactNode} props.content - The text to show in the tooltip
 * @param {React.ReactNode} [props.children] - The trigger element. Defaults to an Info icon.
 * @param {string} [props.width="w-56"] - Tailwind width class
 */
const Tooltip = ({ content, children, width = "w-56" }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
  };

  useEffect(() => {
    if (show) {
      updatePosition();
      // Listen for scroll/resize to keep tooltip attached to the trigger
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [show]);

  if (!content) return children;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center cursor-help"
      >
        {children || (
          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </span>

      {show &&
        createPortal(
          <div
            className={`fixed z-[9999] pointer-events-none ${width} rounded-[8px] bg-slate-800 text-white text-[11px] font-normal leading-relaxed px-3 py-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-center`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: "translate(-50%, calc(-100% - 10px))",
            }}
          >
            {content}
            <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800" />
          </div>,
          document.body,
        )}
    </>
  );
};

export default Tooltip;
