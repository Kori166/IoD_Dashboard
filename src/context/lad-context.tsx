import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LAD_OPTIONS, type LadOption } from "@/config/lads";

type LadContextValue = {
  activeLad: LadOption;
  setActiveLadBySlug: (slug: string) => void;
  allLads: LadOption[];
};

const LadContext = createContext<LadContextValue | null>(null);

const STORAGE_KEY = "iod-dashboard-active-lad";

export function LadProvider({ children }: { children: React.ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string>(() => {
    if (typeof window === "undefined") return LAD_OPTIONS[0]?.slug ?? "bristol";
    return window.localStorage.getItem(STORAGE_KEY) || LAD_OPTIONS[0]?.slug || "bristol";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, activeSlug);
  }, [activeSlug]);

  const activeLad =
    LAD_OPTIONS.find((lad) => lad.slug === activeSlug) ?? LAD_OPTIONS[0];

  const value = useMemo<LadContextValue>(
    () => ({
      activeLad,
      allLads: LAD_OPTIONS,
      setActiveLadBySlug: (slug: string) => {
        if (LAD_OPTIONS.some((lad) => lad.slug === slug)) {
          setActiveSlug(slug);
        }
      },
    }),
    [activeLad],
  );

  return <LadContext.Provider value={value}>{children}</LadContext.Provider>;
}

export function useLad() {
  const context = useContext(LadContext);
  if (!context) {
    throw new Error("useLad must be used within a LadProvider");
  }
  return context;
}