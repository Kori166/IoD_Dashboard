/*
  App sidebar navigation component.

  This component shows the main app navigation links. It also changes its display when the sidebar is collapsed.

  Provenance:
  - React (no date) ‘Conditional Rendering’ [online]. Available from:
    https://react.dev/learn/conditional-rendering 
    Used for showing different sidebar content when collapsed or expanded.

  - React Router (no date) ‘NavLink’ [online]. Available from:
    https://reactrouter.com/api/components/NavLink 
    Used for navigation links between app pages.

  - React Router (no date) ‘useLocation’ [online]. Available from:
    https://reactrouter.com/api/hooks/useLocation 
    Used as the routing pattern for reading the current page location.

  - Lucide (no date) ‘Lucide React’ [online]. Available from:
    https://lucide.dev/guide/packages/lucide-react 
    Used for the sidebar navigation icons.

  - shadcn (no date) ‘Sidebar’ [online]. Available from:
    https://ui.shadcn.com/docs/components/sidebar 
    Used for the sidebar layout and menu component pattern.
*/

import { LayoutDashboard, Map, BarChart3, Database, MapPin, Clock} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar} from "@/components/ui/sidebar";

// Main sidebar links used to build the navigation menu
const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Map Comparison", url: "/map", icon: Map },
  { title: "Time Series", url: "/time-series", icon: Clock },
  { title: "Feature Analysis", url: "/indicators", icon: BarChart3 },
  { title: "Data Sources", url: "/sources", icon: Database },
];

export function AppSidebar() {
  // Checks whether the sidebar is open or collapsed
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  // Reads the current route from React Router
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        {/* Shows the full title when the sidebar is expanded. */}
        {!collapsed && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight">
                  UK Deprivation
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  Index Replication
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shows only the icon when the sidebar is collapsed. */}
        {collapsed && (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {/* Builds each menu item from the navItems list. */}
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}