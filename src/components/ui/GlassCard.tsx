import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "solid";
  hover?: boolean;
  style?: CSSProperties;
}

export const GlassCard = ({ 
  children, 
  className, 
  variant = "default",
  hover = false,
  style 
}: GlassCardProps) => {
  const variants = {
    default: "glass-panel",
    subtle: "glass-panel-subtle",
    solid: "bg-card rounded-2xl border border-border shadow-glass",
  };

  return (
    <div
      className={cn(
        variants[variant],
        hover && "transition-smooth hover:scale-[1.02] hover:shadow-glass-lg cursor-pointer",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
};
