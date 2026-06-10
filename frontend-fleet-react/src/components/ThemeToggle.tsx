import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const storageKey = "fleet_theme";

export function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
