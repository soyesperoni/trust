"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { SESSION_USER_UPDATED_EVENT } from "../lib/session";

export type CurrentUser = {
  id: number;
  full_name: string;
  email?: string;
  role: string;
  role_label: string;
  is_active: boolean;
};

export const SESSION_USER_KEY = "trust.currentUser";

const getSessionUserSnapshot = (): CurrentUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const sessionUserRaw = window.localStorage.getItem(SESSION_USER_KEY);
    if (!sessionUserRaw) return null;
    const parsed = JSON.parse(sessionUserRaw) as Partial<CurrentUser> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.full_name && !parsed.email) return null;

    return {
      id: typeof parsed.id === "number" ? parsed.id : 0,
      full_name: parsed.full_name?.trim() || parsed.email?.trim() || "Usuario",
      email: parsed.email?.trim(),
      role: parsed.role ?? "",
      role_label: parsed.role_label ?? "",
      is_active: parsed.is_active ?? true,
    };
  } catch {
    return null;
  }
};

const subscribeToSessionChanges = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const handleChange = () => callback();
  window.addEventListener("storage", handleChange);
  window.addEventListener(SESSION_USER_UPDATED_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SESSION_USER_UPDATED_EVENT, handleChange);
  };
};

const getSessionEmailSnapshot = () => {
  if (typeof window === "undefined") return "";
  try {
    const sessionUserRaw = window.localStorage.getItem(SESSION_USER_KEY);
    if (!sessionUserRaw) return "";
    const sessionUser = JSON.parse(sessionUserRaw) as { email?: string };
    return sessionUser.email?.trim().toLowerCase() ?? "";
  } catch {
    return "";
  }
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(() => getSessionUserSnapshot());
  const [isLoading, setIsLoading] = useState(() => !getSessionUserSnapshot());
  const sessionEmail = useSyncExternalStore(
    subscribeToSessionChanges,
    getSessionEmailSnapshot,
    () => "",
  );

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/users", {
          cache: "no-store",
          headers: { "x-current-user-email": sessionEmail },
        });
        if (!response.ok) throw new Error("No se pudo cargar el usuario actual.");
        const data = await response.json();
        if (!isMounted) return;
        const results = (data.results ?? []) as CurrentUser[];
        const matchedSessionUser = sessionEmail
          ? results.find(
              (candidate) =>
                candidate.email?.trim().toLowerCase() === sessionEmail,
            ) ?? null
          : null;

        const resolvedUser = sessionEmail
          ? matchedSessionUser
          : results.find((candidate) => candidate.is_active) ?? results[0] ?? null;
        setUser(resolvedUser);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [sessionEmail]);

  return { user, isLoading };
}
