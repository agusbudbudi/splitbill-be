import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

export default function BackButton({ to, onClick, className, ...props }) {
  const navigate = useNavigate();

  function handleClick() {
    if (onClick) return onClick();
    if (to) return navigate(to);
    navigate(-1);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "p-2 rounded-xs bg-white border border-border shadow-soft text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex-shrink-0",
        className
      )}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
