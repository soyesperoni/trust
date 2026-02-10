"use client";

import Link from "next/link";

import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  ACCOUNT_ADMIN_ROLE,
  BRANCH_ADMIN_ROLE,
  INSPECTOR_ROLE,
} from "../lib/permissions";

type MobileBottomNavProps = {
  activePath: string;
};

type MobileNavItem = {
  label: string;
  href: string;
  icon: string;
};

const mobileItems: MobileNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Calendario", href: "/clientes/calendario", icon: "calendar_today" },
  { label: "Historial", href: "/clientes/visitas", icon: "history" },
  { label: "Incidencias", href: "/clientes/incidencias", icon: "report_problem" },
];

export default function MobileBottomNav({ activePath }: MobileBottomNavProps) {
  const { user } = useCurrentUser();
  const isRestrictedRole =
    user?.role === ACCOUNT_ADMIN_ROLE ||
    user?.role === BRANCH_ADMIN_ROLE ||
    user?.role === INSPECTOR_ROLE;

  if (!isRestrictedRole) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 md:hidden dark:border-slate-800 dark:bg-[#161e27]">
      <div className="grid grid-cols-4 gap-1">
        {mobileItems.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 text-center transition-colors ${
                isActive
                  ? "bg-yellow-50 text-slate-900 dark:bg-primary/20 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${isActive ? "filled" : ""}`}>
                {item.icon}
              </span>
              <span className="mt-1 text-[11px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
