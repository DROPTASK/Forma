import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemePref } from "@/lib/types";

const KEY = "forma-theme";

function applyTheme(pref: ThemePref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

const ThemeCtx = createContext<{
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}>({ pref: "system", setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as ThemePref | null) ?? "system";
    setPrefState(stored);
    applyTheme(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem(KEY) as ThemePref | null) ?? "system";
      applyTheme(current);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setPref = (p: ThemePref) => {
    localStorage.setItem(KEY, p);
    setPrefState(p);
    applyTheme(p);
  };

  const value = useMemo(() => ({ pref, setPref }), [pref]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
