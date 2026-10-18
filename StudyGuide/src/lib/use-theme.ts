import { useCallback, useEffect, useState } from "react";
import { applyTheme, loadTheme, saveTheme, type Theme } from "./progress";

/** Light/dark theme state, kept in sync with localStorage and the DOM class. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const initial = loadTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      saveTheme(next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
