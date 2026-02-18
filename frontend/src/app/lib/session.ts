import { SESSION_USER_KEY } from "../hooks/useCurrentUser";

export const SESSION_USER_UPDATED_EVENT = "trust:session-user-updated";

const notifySessionChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_USER_UPDATED_EVENT));
};

export const getSessionUserEmail = () => {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email?.trim() ?? "";
  } catch {
    return "";
  }
};

export const setSessionUser = (user: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  notifySessionChange();
};

export const clearSessionUser = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_USER_KEY);
  notifySessionChange();
};
