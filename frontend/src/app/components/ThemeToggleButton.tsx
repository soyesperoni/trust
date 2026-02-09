"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const resolveTheme = (): ThemeMode => {
  if (typeof document === "undefined") return "light";
  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  return "light";
};

export default function ThemeToggleButton() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    setTheme(resolveTheme());
  }, []);

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
      onClick={toggleTheme}
      type="button"
    >
      <span className="material-symbols-outlined">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
