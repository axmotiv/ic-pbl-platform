import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

type GlassVariant = "default" | "strong" | "card";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  hoverable?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<GlassVariant, string> = {
  default: "glass",
  strong: "glass-strong",
  card: "glass-card",
};

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = "card", hoverable = false, children, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl ${VARIANT_CLASSES[variant]} ${
          hoverable
            ? "hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/[0.06] transition-all duration-300 ease-out"
            : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
