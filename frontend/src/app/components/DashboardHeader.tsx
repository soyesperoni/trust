"use client";

import type { ReactNode } from "react";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  fetchNotificationIds,
  getUnreadNotificationCount,
  subscribeToRealtimeNotifications,
} from "../lib/notifications";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { clearSessionUser } from "../lib/session";

import BrandLogo from "./BrandLogo";
import ThemeToggleButton from "./ThemeToggleButton";


const getInitials = (fullName: string) => {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("");
  return initials.slice(0, 2).toUpperCase();
};

type DashboardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function DashboardHeader({
  title,
  description,
  action,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { user } = useCurrentUser();

  const [unreadCount, setUnreadCount] = useState(0);

  const userInitials = useMemo(() => {
    if (!user?.full_name) return "?";
    return getInitials(user.full_name);
  }, [user]);

  const handleLogout = () => {
    clearSessionUser();
    router.push("/");
  };

  useEffect(() => {
    let isMounted = true;

    const loadUnreadCount = async () => {
      try {
        const notificationIds = await fetchNotificationIds();
        if (!isMounted) return;
        setUnreadCount(getUnreadNotificationCount(notificationIds));
      } catch {
        if (!isMounted) return;
        setUnreadCount(0);
      }
    };

    loadUnreadCount();
    const unsubscribe = subscribeToRealtimeNotifications(loadUnreadCount);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <>
      <header className="topbar-entrance h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
        <BrandLogo size="xl" className="scale-[1.3]" />
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <Link
            href="/dashboard/notificaciones"
            className="h-10 w-10 inline-flex items-center justify-center relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Ver notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] leading-5 text-center font-semibold border-2 border-white dark:border-[#161e27]">
                {unreadCount}
              </span>
            ) : null}
          </Link>
          <button
            aria-label="Cerrar sesión"
            className="h-10 w-10 inline-flex items-center justify-center relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <header className="topbar-entrance h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          {action ? <div className="hidden md:flex">{action}</div> : null}
          <button
            aria-label="Abrir ajustes"
            className="group flex items-center gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
            onClick={() => router.push("/ajustes")}
            type="button"
          >
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm">
              {userInitials}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                {user?.full_name ?? "Usuario"}
              </span>
              <span className="truncate text-xs text-slate-500">
                {user?.email ?? user?.role_label ?? "-"}
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">
              settings
            </span>
          </button>
          <ThemeToggleButton />
          <Link
            href="/dashboard/notificaciones"
            className="h-10 w-10 inline-flex items-center justify-center relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Ver notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] leading-5 text-center font-semibold border-2 border-white dark:border-[#161e27]">
                {unreadCount}
              </span>
            ) : null}
          </Link>
          <button
            aria-label="Cerrar sesión"
            className="h-10 w-10 inline-flex items-center justify-center relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>
    </>
  );
}
