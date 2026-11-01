"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { clearSessionUser } from "../lib/session";

export const SESSION_EXPIRED_EVENT = "trust:session-expired";

type UseSessionExpiryOptions = {
  enabled?: boolean;
  onExpired?: () => void;
};

type SessionExpiryState = {
  isExpired: boolean;
  expireSession: () => void;
  redirectToLogin: () => void;
};

type SessionWindow = Window & {
  __trustSessionExpiryInterceptor?: boolean;
};

const notifySessionExpired = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

const isSameOriginApiRequest = (input: RequestInfo | URL) => {
  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(rawUrl, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
};

/**
 * Installed once when the module loads so the very first authenticated
 * request is covered, even before the AppShell effects run.
 */
const installUnauthorizedInterceptor = () => {
  if (typeof window === "undefined") return;
  const sessionWindow = window as SessionWindow;
  if (sessionWindow.__trustSessionExpiryInterceptor) return;
  sessionWindow.__trustSessionExpiryInterceptor = true;

  const originalFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch.apply(window, args);
    if (response.status === 401 && isSameOriginApiRequest(args[0])) {
      notifySessionExpired();
    }
    return response;
  };
};

installUnauthorizedInterceptor();

/**
 * Detects 401 responses from same-origin API calls and exposes the state
 * needed to render SessionExpiredModal and return the user to login.
 */
export function useSessionExpiry({
  enabled = true,
  onExpired,
}: UseSessionExpiryOptions = {}): SessionExpiryState {
  const router = useRouter();
  const [isExpired, setIsExpired] = useState(false);
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  const expireSession = useCallback(() => {
    setIsExpired((current) => {
      if (!current) onExpiredRef.current?.();
      return true;
    });
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleExpired = () => expireSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [enabled, expireSession]);

  const redirectToLogin = useCallback(() => {
    clearSessionUser();
    router.replace("/");
    router.refresh();
  }, [router]);

  return { isExpired, expireSession, redirectToLogin };
}
