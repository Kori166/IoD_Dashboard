/*
  Reusable hover card UI component.

  This component wraps Radix UI's hover card primitives with the app's shared Tailwind styling. It is used to show extra content when a user hovers over a trigger element.

  Provenance:
  - shadcn (no date) ‘Hover Card’ [online]. Available from:
    https://ui.shadcn.com/docs/components/hover-card
    Used for the reusable hover card component pattern and styling approach.

  - Radix UI (no date) ‘Hover Card’ [online]. Available from:
    https://www.radix-ui.com/primitives/docs/components/hover-card
    Used for the accessible hover card root, trigger, and content primitives.

  - React (no date) ‘forwardRef’ [online]. Available from:
    https://react.dev/reference/react/forwardRef
    Used for forwarding refs to the underlying Radix content element.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the component styling classes.
*/

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";

// Uses Radix's root component as the base hover card
const HoverCard = HoverCardPrimitive.Root;

// Element that shows the hover card when hovered or focused
const HoverCardTrigger = HoverCardPrimitive.Trigger;

// Displays the hover card content beside the trigger
const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

// Exports the hover card parts for use across the app
export { HoverCard, HoverCardTrigger, HoverCardContent };