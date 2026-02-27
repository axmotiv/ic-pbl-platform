import type { ReactNode } from "react";

type BadgeVariant = "gradient" | "subtle" | "glass";
type BadgeSize = "xs" | "sm";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  gradient?: string;
  color?: string;
  icon?: ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2.5 py-1 text-xs",
};

export default function Badge({
  children,
  variant = "subtle",
  size = "sm",
  gradient,
  color,
  icon,
  className = "",
}: BadgeProps) {
  const baseClasses = `inline-flex items-center gap-1 font-semibold rounded-lg ${SIZE_CLASSES[size]}`;

  if (variant === "gradient" && gradient) {
    return (
      <span className={`${baseClasses} text-white bg-gradient-to-r ${gradient} shadow-md shadow-black/10 ${className}`}>
        {icon}
        {children}
      </span>
    );
  }

  if (variant === "glass") {
    return (
      <span className={`${baseClasses} bg-black/50 backdrop-blur-sm text-white ${className}`}>
        {icon}
        {children}
      </span>
    );
  }

  // subtle
  return (
    <span className={`${baseClasses} backdrop-blur-sm ${color || "bg-blue-50/80 text-blue-600"} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
