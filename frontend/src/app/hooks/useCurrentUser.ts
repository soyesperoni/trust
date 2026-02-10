"use client";

import { useEffect, useState } from "react";

export type CurrentUser = {
  id: number;
  full_name: string;
  email?: string;
  role: string;
  role_label: string;
  is_active: boolean;
};

export const SESSION_USER_KEY = "trust.currentUser";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const sessionUserRaw = window.localStorage.getItem(SESSION_USER_KEY);
    let sessionEmail: string | null = null;

    if (sessionUserRaw) {
      try {
        const sessionUser = JSON.parse(sessionUserRaw) as { email?: string };
        sessionEmail = sessionUser.email?.trim().toLowerCase() ?? null;
      } catch {
        window.localStorage.removeItem(SESSION_USER_KEY);
      }
    }

    const loadUser = async () => {
      try {
        const response = await fetch("/api/users", {
          cache: "no-store",
          headers: { "x-current-user-email": sessionEmail ?? "" },
        });
        if (!response.ok) throw new Error("No se pudo cargar el usuario actual.");
        const data = await response.json();
        if (!isMounted) return;
        const results = (data.results ?? []) as CurrentUser[];
        const resolvedUser =
          (sessionEmail
            ? results.find(
                (candidate) => candidate.email?.trim().toLowerCase() === sessionEmail,
              )
            : null) ??
          results.find((candidate) => candidate.is_active) ??
          results[0] ??
          null;
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
  }, []);

  return { user, isLoading };
}
