/*
  Reusable badge UI component.

  This component provides small label-style badges with shared styling and several visual variants.

  Provenance:
  - shadcn (no date) ‘Badge’ [online]. Available from:
    https://ui.shadcn.com/docs/components/badge
    Used for the reusable badge component pattern and styling approach.

  - class-variance-authority (no date) ‘Class Variance Authority’ [online]. Available from:
    https://cva.style/docs
    Used for managing badge style variants.

  - React (no date) ‘Components’ [online]. Available from:
    https://react.dev/learn/your-first-component
    Used for the React component structure and props typing.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the component styling classes.
*/

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Defines the base badge styles and available visual variants
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Defines the props accepted by the Badge component
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

// Renders a styled badge with the selected variant
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Exports the badge component and its variant styles
export { Badge, badgeVariants };