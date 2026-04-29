/*
  Reusable aspect ratio UI component.

  This component exposes Radix UI's aspect ratio primitive so media or layout blocks can keep a fixed width-to-height ratio.

  Provenance:
  - shadcn (no date) ‘Aspect Ratio’ [online]. Available from:
    https://ui.shadcn.com/docs/components/aspect-ratio
    Used for the reusable aspect ratio component pattern.

  - Radix UI (no date) ‘Aspect Ratio’ [online]. Available from:
    https://www.radix-ui.com/primitives/docs/components/aspect-ratio
    Used for the underlying aspect ratio primitive.
*/

import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

// Uses Radix's root component as the app's aspect ratio wrapper
const AspectRatio = AspectRatioPrimitive.Root;

// Exports the aspect ratio component for use across the app
export { AspectRatio };