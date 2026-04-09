import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, Clock, Check } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLad } from "@/context/lad-context";

export function TopBar() {
  const { activeLad, allLads, setActiveLadBySlug } = useLad();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    return allLads.filter((lad) => {
      return (
        !term ||
        lad.name.toLowerCase().includes(term) ||
        lad.code.toLowerCase().includes(term) ||
        lad.slug.toLowerCase().includes(term)
      );
    });
  }, [allLads, query]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectLad(slug: string) {
    setActiveLadBySlug(slug);
    setOpen(false);
    setQuery("");
  }

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
        <div className="relative hidden md:block" ref={anchorRef}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs">Search LADs...</span>
            <kbd className="ml-4 text-[10px] bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
              ⌘K
            </kbd>
          </button>

          {open ? (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-[calc(100%+8px)] z-[100] w-[320px] rounded-xl border border-border/50 bg-background/95 p-2 shadow-2xl backdrop-blur-sm"
            >
              <div className="mb-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (!results.length && event.key !== "Escape") return;

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setActiveIndex((current) => (current + 1) % results.length);
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setActiveIndex((current) =>
                        current === 0 ? results.length - 1 : current - 1,
                      );
                    }

                    if (event.key === "Enter" && results.length) {
                      event.preventDefault();
                      selectLad(results[activeIndex].slug);
                    }

                    if (event.key === "Escape") {
                      setOpen(false);
                    }
                  }}
                  autoFocus
                  placeholder="Filter local authority districts..."
                  className="w-full rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1">
                {results.length ? (
                  results.map((lad, index) => {
                    const active = index === activeIndex;
                    const selected = lad.slug === activeLad.slug;

                    return (
                      <button
                        key={lad.slug}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectLad(lad.slug)}
                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                          active ? "bg-primary/15" : "hover:bg-background/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{lad.name}</span>
                          {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {lad.code} · {lad.slug}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    No matching LADs
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
          <MapPin className="h-3 w-3" />
          {activeLad.name}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Mar 14, 2026</span>
        </div>

        <StatusBadge status="fresh" label="Live" />
      </div>
    </header>
  );
}