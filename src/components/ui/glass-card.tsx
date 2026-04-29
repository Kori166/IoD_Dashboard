/*
  Reusable glass card UI component.

  This component wraps content in the app's custom glass-panel styling. It can optionally add hover effects, glow effects, and entrance animation.

  Provenance:
  - React (no date) ‘Passing JSX as children’ [online]. Available from:
    https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children
    Used for passing page content into the card through children.

  - Motion (no date) ‘React animation’ [online]. Available from:
    https://motion.dev/docs/react
    Used for the optional animated card entrance.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for combining utility classes and conditional styling.

  - MDN (no date) ‘box-shadow’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow
    Used for the glow shadow effects.

  - MDN (no date) ‘Using CSS custom properties’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties
    Used for the glow colour variables.
*/

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

// Defines the props accepted by the GlassCard component
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "violet" | "magenta" | "none";
  animate?: boolean;
}

// Displays content inside a reusable glass-style card
export function GlassCard({ children, className, hover = true, glow = "none", animate = true }: GlassCardProps) {
  // Sets optional glow styles for hover states.
  const glowStyles = {
    cyan: "hover:shadow-[0_0_30px_-5px_hsl(var(--glow-cyan)/0.2)]",
    violet: "hover:shadow-[0_0_30px_-5px_hsl(var(--glow-violet)/0.2)]",
    magenta: "hover:shadow-[0_0_30px_-5px_hsl(var(--glow-magenta)/0.2)]",
    none: "",
  };

  // Uses motion.div when animation is enabled, otherwise uses a normal div
  const Wrapper = animate ? motion.div : "div";

  // Adds a small fade-and-rise animation when enabled
  const animateProps = animate
    ? {
        initial: { opacity: 0, y: 12 } as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0.4, ease: "easeOut" as const },
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