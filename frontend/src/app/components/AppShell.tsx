"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  ACCOUNT_ADMIN_ROLE,
  isAccountAdminAllowedPath,
} from "../lib/permissions";
import DashboardSidebar from "./DashboardSidebar";

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

  useEffect(() => {
    if (!pathname || pathname === "/" || isLoading) return;
    if (user?.role === ACCOUNT_ADMIN_ROLE && !isAccountAdminAllowedPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [isLoading, pathname, router, user?.role]);

  if (!pathname || pathname === "/") {
    return <>{children}</>;
  }

  const activePath = resolveActivePath(pathname);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-slate-800 dark:text-slate-200">
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar activePath={activePath} />

        <main className="flex-1 flex flex-col overflow-hidden bg-background-light dark:bg-background-dark relative">
          {children}
        </main>
      </div>
    </div>
  );
}
