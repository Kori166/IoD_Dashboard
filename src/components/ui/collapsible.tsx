/*
  Reusable collapsible UI component.

  This component exposes Radix UI's collapsible primitives so sections of content can be opened and closed.

  Provenance:
  - shadcn (no date) ‘Collapsible’ [online]. Available from:
    https://ui.shadcn.com/docs/components/collapsible
    Used for the reusable collapsible component pattern.

  - Radix UI (no date) ‘Collapsible’ [online]. Available from:
    https://www.radix-ui.com/primitives/docs/components/collapsible
    Used for the accessible collapsible root, trigger, and content primitives.
*/

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

// Uses Radix's root component as the main collapsible wrapper
const Collapsible = CollapsiblePrimitive.Root;

// Button or element that opens and closes the collapsible content
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

// Content area that is shown or hidden
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

// Exports the collapsible parts for use across the app
export { Collapsible, CollapsibleTrigger, CollapsibleContent };