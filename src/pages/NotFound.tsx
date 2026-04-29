/*
  Not found page.

  This component displays a 404 message when the user visits a route that does not exist. It also logs the missing route path to the console.

  Provenance:
  - React (no date) ‘useEffect’ [online]. Available from:
    https://react.dev/reference/react/useEffect
    Used for logging the missing route when the page is shown.

  - React Router (no date) ‘useLocation’ [online]. Available from:
    https://reactrouter.com/api/hooks/useLocation
    Used for reading the current route path.

  - React Router (no date) ‘No Match 404’ [online]. Available from:
    https://reactrouter.com/start/library/routing
    Used for the general 404 route handling pattern.

  - Tailwind Labs (no date) ‘Styling with utility classes’ [online]. Available from:
    https://tailwindcss.com/docs/styling-with-utility-classes
    Used for the page layout and styling classes.
*/

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  // ggets the route the user tried to visit
  const location = useLocation();

  // logs missing route attempts for debuging
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>

        {/* Sends the user back to the home page */}
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;