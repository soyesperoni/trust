import { SESSION_USER_KEY } from "../hooks/useCurrentUser";

export const SESSION_USER_UPDATED_EVENT = "trust:session-user-updated";

const notifySessionChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_USER_UPDATED_EVENT));
};

const getSessionUserRaw = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      email?: string;
      full_name?: string;
      id?: number;
    };

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const hasSessionUser = () => {
  const parsed = getSessionUserRaw();
  if (!parsed) return false;

  const hasEmail = typeof parsed.email === "string" && parsed.email.trim().length > 0;
  const hasName = typeof parsed.full_name === "string" && parsed.full_name.trim().length > 0;
  const hasId = typeof parsed.id === "number" && Number.isFinite(parsed.id) && parsed.id > 0;

  return hasEmail || hasName || hasId;
};

export const getSessionUserEmail = () => {
  const parsed = getSessionUserRaw();
  if (!parsed) return "";
  return parsed.email?.trim() ?? "";
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
