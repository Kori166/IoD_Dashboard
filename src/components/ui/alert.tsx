/*
  Reusable alert UI component.

  This component provides styled alert messages for showing important information, including default and destructive alert styles.

  Provenance:
  - shadcn (no date) ‘Alert’ [online]. Available from:
    https://ui.shadcn.com/docs/components/alert
    Used for the reusable alert component pattern and styling approach.

  - class-variance-authority (no date) ‘Class Variance Authority’ [online]. Available from:
    https://cva.style/docs
    Used for managing alert style variants.

  - React (no date) ‘forwardRef’ [online]. Available from:
    https://react.dev/reference/react/forwardRef
    Used for forwarding refs to the alert elements.

  - MDN (no date) ‘ARIA: alert role’ [online]. Available from:
    https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role
    Used for the role="alert" accessibility attribute.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the component styling classes.
*/

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Defines the base alert styles and available visual variants
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Main alert container
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

// Alert heading text
const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

// Supporting alert message text
const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

// Exports the alert parts for use across the app
export { Alert, AlertTitle, AlertDescription };