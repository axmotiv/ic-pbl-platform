"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, children, className = "" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative glass-strong rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col z-10 animate-fade-in ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/* Sub-components for composability */

export function ModalHeader({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-gray-100/50">
      <div className="min-w-0 flex-1">{children}</div>
      <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex-1 overflow-y-auto p-5 ${className}`}>{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 border-t border-gray-100">
      {children}
    </div>
  );
}
