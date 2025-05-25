"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: ThemeProviderProps) {
  // Initialize theme from localStorage if available, otherwise use defaultTheme
  const [theme, setTheme] = useState<Theme>(() => {
    // This runs only on the client side during initial render
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      return savedTheme || defaultTheme;
    }
    return defaultTheme;
  });

  // Function to get the actual theme based on system preference
  const getActualTheme = (): string => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  };

  // Apply theme class to document
  const applyTheme = () => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    const actualTheme = getActualTheme();
    root.classList.add(actualTheme);
  };

  // Handle system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Save the theme preference to localStorage
    localStorage.setItem("theme", theme);

    // Apply the theme immediately
    applyTheme();

    // Set up listener for system theme changes if using system theme
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
