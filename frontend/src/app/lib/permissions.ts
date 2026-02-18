export const ACCOUNT_ADMIN_ROLE = "account_admin";
export const BRANCH_ADMIN_ROLE = "branch_admin";
export const INSPECTOR_ROLE = "inspector";
export const GENERAL_ADMIN_ROLE = "general_admin";

export const DASHBOARD_RESTRICTED_ROLES = [ACCOUNT_ADMIN_ROLE, BRANCH_ADMIN_ROLE, INSPECTOR_ROLE];

const ACCOUNT_ADMIN_BLOCKED_PATH_PREFIXES = [
  "/clientes/sucursales/nueva",
  "/clientes/areas/nueva",
  "/clientes/calendario/nueva",
  "/clientes/incidencias/nueva",
  "/clientes/incidencias/agendar",
];

const BRANCH_ADMIN_BLOCKED_PATH_PREFIXES = [
  "/clientes/sucursales",
  "/clientes/areas/nueva",
  "/clientes/calendario/nueva",
  "/clientes/incidencias/agendar",
];

const INSPECTOR_BLOCKED_PATH_PREFIXES = [
  "/clientes/sucursales/nueva",
  "/clientes/areas/nueva",
  "/clientes/calendario/nueva",
  "/clientes/incidencias/nueva",
];

export const ACCOUNT_ADMIN_ALLOWED_PATH_PREFIXES = [
  "/ajustes",
  "/dashboard",
  "/clientes/sucursales",
  "/clientes/areas",
  "/clientes/dispensadores",
  "/clientes/productos",
  "/clientes/calendario",
  "/clientes/visitas",
  "/clientes/incidencias",
];

export const BRANCH_ADMIN_ALLOWED_PATH_PREFIXES = [
  "/ajustes",
  "/dashboard",
  "/clientes/areas",
  "/clientes/dispensadores",
  "/clientes/productos",
  "/clientes/calendario",
  "/clientes/visitas",
  "/clientes/incidencias",
];

export const INSPECTOR_ALLOWED_PATH_PREFIXES = [
  "/ajustes",
  "/dashboard",
  "/clientes/data",
  "/clientes/sucursales",
  "/clientes/areas",
  "/clientes/dispensadores",
  "/clientes/productos",
  "/clientes/calendario",
  "/clientes/visitas",
  "/clientes/incidencias",
];

const matchesPathPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const isPathAllowed = (
  pathname: string,
  blockedPrefixes: string[],
  allowedPrefixes: string[],
) => {
  const isBlockedPath = blockedPrefixes.some((prefix) =>
    matchesPathPrefix(pathname, prefix),
  );
  if (isBlockedPath) return false;

  return allowedPrefixes.some((prefix) => matchesPathPrefix(pathname, prefix));
};

export const isRestrictedDashboardRole = (role?: string | null) =>
  !!role && DASHBOARD_RESTRICTED_ROLES.includes(role);

export const isAccountAdminAllowedPath = (pathname: string) =>
  isPathAllowed(
    pathname,
    ACCOUNT_ADMIN_BLOCKED_PATH_PREFIXES,
    ACCOUNT_ADMIN_ALLOWED_PATH_PREFIXES,
  );

export const isBranchAdminAllowedPath = (pathname: string) =>
  isPathAllowed(
    pathname,
    BRANCH_ADMIN_BLOCKED_PATH_PREFIXES,
    BRANCH_ADMIN_ALLOWED_PATH_PREFIXES,
  );

export const isInspectorAllowedPath = (pathname: string) =>
  isPathAllowed(
    pathname,
    INSPECTOR_BLOCKED_PATH_PREFIXES,
    INSPECTOR_ALLOWED_PATH_PREFIXES,
  );
