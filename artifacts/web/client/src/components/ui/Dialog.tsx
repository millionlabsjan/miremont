import { useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-brand-border">
            <h2 className="font-serif text-xl font-bold text-brand-dark">{title}</h2>
            <button onClick={onClose} className="text-brand-warm hover:text-brand-dark">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="border-t border-brand-border p-4 flex items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
