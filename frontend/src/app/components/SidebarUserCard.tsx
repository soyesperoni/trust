"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "../hooks/useCurrentUser";
import { clearSessionUser } from "../lib/session";

const getInitials = (fullName: string) => {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
  return initials.slice(0, 2).toUpperCase();
};

export default function SidebarUserCard() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();

  const initials = useMemo(() => {
    if (!user?.full_name) return "?";
    return getInitials(user.full_name);
  }, [user]);

  const handleLogout = () => {
    clearSessionUser();
    router.push("/");
  };

  const handleOpenSettings = () => {
    router.push("/ajustes");
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        className="group flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
        onClick={handleOpenSettings}
        type="button"
      >
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {user?.full_name ?? (isLoading ? "Cargando usuario..." : "Usuario no disponible")}
          </span>
          <span className="truncate text-xs text-slate-500">
            {user?.email ?? user?.role_label ?? (isLoading ? " " : "-")}
          </span>
        </div>
        <span className="material-symbols-outlined text-[18px] text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">
          settings
        </span>
      </button>
      <button
        className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-md py-2 transition-colors"
        onClick={handleLogout}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">logout</span>
        Cerrar sesión
      </button>
    </div>
  );
}
