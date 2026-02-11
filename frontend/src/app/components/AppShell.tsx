"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  ACCOUNT_ADMIN_ROLE,
  BRANCH_ADMIN_ROLE,
  INSPECTOR_ROLE,
  isAccountAdminAllowedPath,
  isBranchAdminAllowedPath,
  isInspectorAllowedPath,
} from "../lib/permissions";
import DashboardSidebar from "./DashboardSidebar";
import MobileBottomNav from "./MobileBottomNav";

type AppShellProps = {
  children: ReactNode;
};

const navigationPriority = [
  "/ajustes",
  "/clientes/incidencias",
  "/clientes/calendario",
  "/clientes/visitas",
  "/clientes/productos",
  "/clientes/dispensadores",
  "/clientes/areas",
  "/clientes/sucursales",
  "/clientes/data",
  "/clientes",
  "/dashboard",
];

const resolveActivePath = (path: string) => {
  if (!path) return "/dashboard";
  if (path.startsWith("/clientes/nuevo-usuario")) {
    return "/clientes";
  }
  if (path.startsWith("/clientes/nuevo")) {
    return "/clientes/data";
  }
  const matched =
    navigationPriority.find(
      (route) => path === route || path.startsWith(`${route}/`),
    ) ?? "/dashboard";
  return matched;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const isMobileIncidentCreation = pathname === "/clientes/incidencias/nueva";
  const isMobileVisitFlow = pathname.includes("/clientes/visitas/") && pathname.endsWith("/realizar");
  const isPublicVisitReport = pathname.startsWith("/visits/report/public/");

  useEffect(() => {
    if (!pathname || pathname === "/" || isLoading || isPublicVisitReport) return;
    if (user?.role === ACCOUNT_ADMIN_ROLE && !isAccountAdminAllowedPath(pathname)) {
      router.replace("/dashboard");
      return;
    }
    if (user?.role === BRANCH_ADMIN_ROLE && !isBranchAdminAllowedPath(pathname)) {
      router.replace("/dashboard");
      return;
    }
    if (user?.role === INSPECTOR_ROLE && !isInspectorAllowedPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [isLoading, isPublicVisitReport, pathname, router, user?.role]);

  if (!pathname || pathname === "/" || isPublicVisitReport) {
    return <>{children}</>;
  }

  const activePath = resolveActivePath(pathname);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-800 dark:text-slate-200">
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar activePath={activePath} />

        <main
          className={`flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative ${
            isMobileIncidentCreation || isMobileVisitFlow ? "pb-0" : "pb-24 md:pb-0"
          }`}
        >
          {children}
        </main>
      </div>
      <div className={isMobileIncidentCreation || isMobileVisitFlow ? "hidden md:block" : "block"}>
        <MobileBottomNav activePath={activePath} />
      </div>
    </div>
  );
}
