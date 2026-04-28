/*
  Dashboard layout component.

  This component wraps dashboard pages with the sidebar, top bar, and main content area.

  Provenance:
  - React (no date) ‘Passing JSX as children’ [online]. Available from:
    https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children
    Used for the children layout pattern.

  - React TypeScript Cheatsheet (no date) ‘ReactNode’ [online]. Available from:
    https://react-typescript-cheatsheet.netlify.app/docs/react-types/reactnode/    
    Used for typing the children prop.

  - shadcn (no date) ‘Sidebar’ [online]. Available from:
    https://ui.shadcn.com/docs/components/sidebar 
    Used for the SidebarProvider layout pattern.

  - Tailwind Labs (no date) ‘Flex’ [online]. Available from:
    https://tailwindcss.com/docs/flex 
    Used for the main flex layout classes.
*/

import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    // Gives the sidebar state to the layout and sidebar components
    <SidebarProvider>
      <div className="min-h-screen flex w-full gradient-mesh">
        <AppSidebar />

        {/* Main page area beside the sidebar. */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* Displays the current page content. */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
