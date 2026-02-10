const READ_NOTIFICATIONS_KEY = "read-notification-ids";
export const NOTIFICATIONS_UPDATED_EVENT = "notifications-updated";

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

export const fetchNotificationIds = async () => {
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

  const incidentIds = (incidentsData.results ?? []).map(
    (incident: Incident) => `incident-${incident.id}`,
  );
  const visitIds = (visitsData.results ?? []).map((visit: Visit) => `visit-${visit.id}`);

  return [...incidentIds, ...visitIds];
};

