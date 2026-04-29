/*
  Reusable avatar UI component.

  This component wraps Radix UI's avatar primitives with the app's shared styling. It shows a user image when available and fallback content when the image cannot be shown.

  Provenance:
  - shadcn (no date) ‘Avatar’ [online]. Available from:
    https://ui.shadcn.com/docs/components/avatar
    Used for the reusable avatar component pattern and styling approach.

  - Radix UI (no date) ‘Avatar’ [online]. Available from:
    https://www.radix-ui.com/primitives/docs/components/avatar
    Used for the accessible avatar root, image, and fallback primitives.

  - React (no date) ‘forwardRef’ [online]. Available from:
    https://react.dev/reference/react/forwardRef
    Used for forwarding refs to the underlying Radix elements.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the component styling classes.
*/

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

// Main avatar wrapper that controls the size, shape, and overflow
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

// Displays the avatar image
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

// Shows fallback content when the image is missing or cannot load
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Exports the avatar parts for use across the app
export { Avatar, AvatarImage, AvatarFallback };