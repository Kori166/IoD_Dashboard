/*
  Reusable card UI component.

  This component provides shared card layout parts for grouped content, including a header, title, description, content area, and footer.

  Provenance:
  - shadcn (no date) ‘Card’ [online]. Available from:
    https://ui.shadcn.com/docs/components/card
    Used for the reusable card component pattern and styling approach.

  - React (no date) ‘forwardRef’ [online]. Available from:
    https://react.dev/reference/react/forwardRef
    Used for forwarding refs to the rendered card elements.

  - React (no date) ‘Components’ [online]. Available from:
    https://react.dev/learn/your-first-component
    Used for the React component structure and props typing.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the component styling classes.
*/

import * as React from "react";
import { cn } from "@/lib/utils";

// Main card wrapper with border, background, text colour, and shadow
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
));
Card.displayName = "Card";

// Top section of the card, usually used for titles or summary text
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

// Main heading text for the card
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

// Supporting text shown under the card title
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

// Main body area of the card
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

// Bottom section of the card, often used for actions or extra details
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

// Exports the card parts for use across the app
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };