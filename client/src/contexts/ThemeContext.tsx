import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const STORAGE_KEY = "theme";
let memoryThemePreference: ThemePreference | null = null;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredThemePreference(
  storage?: Pick<Storage, "getItem"> | null,
): ThemePreference | null {
  try {
    const target =
      storage !== undefined
        ? storage
        : typeof window !== "undefined"
          ? window.localStorage
          : null;
    const raw = target?.getItem(STORAGE_KEY);
    if (isThemePreference(raw)) {
      memoryThemePreference = raw;
      return raw;
    }
  } catch {
    // Fall back to in-memory preference when localStorage is blocked or unavailable.
  }
  return memoryThemePreference;
}

export function writeStoredThemePreference(
  preference: ThemePreference,
  storage?: Pick<Storage, "setItem"> | null,
): boolean {
  memoryThemePreference = preference;
  try {
    const target =
      storage !== undefined
        ? storage
        : typeof window !== "undefined"
          ? window.localStorage
          : null;
    if (!target) return false;
    target.setItem(STORAGE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function resetMemoryThemePreferenceForTests(): void {
  memoryThemePreference = null;
}

function getSystemTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function resolveTheme(preference: ThemePreference, systemTheme: Theme): Theme {
  return preference === "system" ? systemTheme : preference;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = true,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = readStoredThemePreference();
    return stored ?? defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<Theme>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    let media: MediaQueryList;
    try {
      media = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    setSystemTheme(media.matches ? "dark" : "light");
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const theme = resolveTheme(preference, systemTheme);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", theme === "dark" ? "#141b18" : "#f4f1e9");
      }
    }
    writeStoredThemePreference(preference);
  }, [preference, theme]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      if (!switchable) return;
      writeStoredThemePreference(next);
      setPreferenceState(next);
    },
    [switchable],
  );

  const toggleTheme = useMemo(() => {
    if (!switchable) return undefined;
    return () => {
      const next: Theme = theme === "light" ? "dark" : "light";
      writeStoredThemePreference(next);
      setPreferenceState(next);
    };
  }, [switchable, theme]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      setPreference,
      toggleTheme,
      switchable,
    }),
    [theme, preference, setPreference, toggleTheme, switchable],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
