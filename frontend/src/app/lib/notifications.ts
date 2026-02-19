const READ_NOTIFICATIONS_KEY = "read-notification-ids";
export const NOTIFICATIONS_UPDATED_EVENT = "notifications-updated";
const NOTIFICATIONS_POLL_INTERVAL_MS = 10000;

type Incident = {
  id: number;
};

type Visit = {
  id: number;
};

const parseIds = (value: string | null): Set<string> => {
  if (!value) return new Set();
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item) => typeof item === "string"));
  } catch {
    return new Set();
  }
};

export const getReadNotificationIds = () => {
  if (typeof window === "undefined") return new Set<string>();
  return parseIds(window.localStorage.getItem(READ_NOTIFICATIONS_KEY));
};

export const markNotificationsAsRead = (ids: string[]) => {
  if (typeof window === "undefined") return;
  const current = getReadNotificationIds();
  ids.forEach((id) => {
    current.add(id);
  });
  window.localStorage.setItem(
    READ_NOTIFICATIONS_KEY,
    JSON.stringify(Array.from(current)),
  );
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};

export const getUnreadNotificationCount = (ids: string[]) => {
  const readIds = getReadNotificationIds();
  return ids.reduce((total, id) => total + (readIds.has(id) ? 0 : 1), 0);
};

export const fetchNotificationsPayload = async () => {
  const [incidentsResponse, visitsResponse] = await Promise.all([
    fetch("/api/incidents", { cache: "no-store" }),
    fetch("/api/visits", { cache: "no-store" }),
  ]);

  if (!incidentsResponse.ok || !visitsResponse.ok) {
    throw new Error("No se pudieron cargar las notificaciones.");
  }

  const [incidentsData, visitsData] = await Promise.all([
    incidentsResponse.json(),
    visitsResponse.json(),
  ]);

  return {
    incidents: incidentsData.results ?? [],
    visits: visitsData.results ?? [],
  };
};

export const fetchNotificationIds = async () => {
  const { incidents, visits } = await fetchNotificationsPayload();

  const incidentIds = incidents.map((incident: Incident) => `incident-${incident.id}`);
  const visitIds = visits.map((visit: Visit) => `visit-${visit.id}`);

  return [...incidentIds, ...visitIds];
};

export const subscribeToRealtimeNotifications = (
  onUpdate: () => void,
  pollIntervalMs = NOTIFICATIONS_POLL_INTERVAL_MS,
) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleSync = () => {
    onUpdate();
  };

  const timerId = window.setInterval(handleSync, pollIntervalMs);

  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
  window.addEventListener("focus", handleSync);
  document.addEventListener("visibilitychange", handleSync);

  return () => {
    window.clearInterval(timerId);
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleSync);
    window.removeEventListener("focus", handleSync);
    document.removeEventListener("visibilitychange", handleSync);
  };
};
