import { SESSION_USER_KEY } from "../hooks/useCurrentUser";

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
