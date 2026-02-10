export const ACCOUNT_ADMIN_ROLE = "account_admin";

const ACCOUNT_ADMIN_BLOCKED_PATH_PREFIXES = [
  "/clientes/sucursales/nueva",
  "/clientes/areas/nueva",
  "/clientes/calendario/nueva",
  "/clientes/incidencias/nueva",
  "/clientes/incidencias/agendar",
];

export const ACCOUNT_ADMIN_ALLOWED_PATH_PREFIXES = [
  "/dashboard",
  "/clientes/sucursales",
  "/clientes/areas",
  "/clientes/dispensadores",
  "/clientes/productos",
  "/clientes/calendario",
  "/clientes/visitas",
  "/clientes/incidencias",
];

export const isAccountAdminAllowedPath = (pathname: string) => {
  const isBlockedPath = ACCOUNT_ADMIN_BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isBlockedPath) return false;

  return ACCOUNT_ADMIN_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
};
