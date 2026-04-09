import { Search, MapPin, Clock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StatusBadge } from "@/components/ui/status-badge";

export function TopBar() {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-border/50 bg-card/40 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden md:block">
          <h1 className="text-sm font-semibold text-foreground">
            Replicating the UK Index of Deprivation
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-sm text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search areas...</span>
          <kbd className="ml-4 text-[10px] bg-background/50 px-1.5 py-0.5 rounded border border-border/50">⌘K</kbd>
        </div>

        {/* Region badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
          <MapPin className="h-3 w-3" />
          Bristol
        </div>

        {/* Last updated */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Mar 14, 2026</span>
        </div>

        <StatusBadge status="fresh" label="Live" />
      </div>
    </header>
  );
}
