/*
  Reusable navigation link component.

  This component wraps React Router's NavLink so the app can use simple active and pending class names for navigation styling.

  Provenance:
  - React Router (no date) ‘NavLink’ [online]. Available from:
    https://reactrouter.com/api/components/NavLink
    Used for route-aware navigation links.

  - React (no date) ‘forwardRef’ [online]. Available from:
    https://react.dev/reference/react/forwardRef
    Used for forwarding refs to the underlying anchor element.

  - TypeScript (no date) ‘Utility Types’ [online]. Available from:
    https://www.typescriptlang.org/docs/handbook/utility-types.html
    Used for Omit when adjusting the inherited NavLink props.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for class-based link styling.
*/

import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Extends React Router's NavLink props with simpler active and pending class options
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

// Wraps React Router's NavLink and applies classes based on route state
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

// Exports the custom navigation link for use across the app
export { NavLink };