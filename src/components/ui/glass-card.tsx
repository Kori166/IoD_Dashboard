import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "violet" | "magenta" | "none";
  animate?: boolean;
}

export function GlassCard({ children, className, hover = true, glow = "none", animate = true }: GlassCardProps) {
  const glowStyles = {
    cyan: "hover:shadow-[0_0_30px_-5px_hsl(var(--glow-cyan)/0.2)]",
    violet: "hover:shadow-[0_0_30px_-5px_hsl(var(--glow-violet)/0.2)]",
    magenta: "hover:shadow-[0_0_30px_-5px_hsl(var(--glow-magenta)/0.2)]",
    none: "",
  };

  const Wrapper = animate ? motion.div : "div";
  const animateProps = animate
    ? {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: "easeOut" },
      }
    : {};

  return (
    <Wrapper
      className={cn(
        "glass-panel",
        hover && "glass-panel-hover",
        glow !== "none" && glowStyles[glow],
        className
      )}
      {...animateProps}
    >
      {children}
    </Wrapper>
  );
}
