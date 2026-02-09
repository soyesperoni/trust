"use client";

import { useEffect } from "react";

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const storedTheme = window.localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export default function ThemeInitializer() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const nextTheme = getInitialTheme();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
  }, []);

  return null;
}
