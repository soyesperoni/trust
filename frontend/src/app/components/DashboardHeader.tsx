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
    if (user?.full_name) return getInitials(user.full_name);
    if (user?.email) return getInitials(user.email);
    return "US";
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
      {/* Header móvil */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 dark:border-slate-800 dark:bg-[#161e27] md:hidden">
        <BrandLogo size="lg" />
        <div className="flex items-center gap-1">
          <ThemeToggleButton />
          <Link
            href="/dashboard/notificaciones"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Ver notificaciones"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>
          <button
            aria-label="Cerrar sesión"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            onClick={handleLogout}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      {/* Header desktop estilo Google Minimalist */}
      <header className="hidden h-16 items-center justify-between border-b border-slate-200/80 bg-white px-6 dark:border-slate-800 dark:bg-[#161e27] md:flex lg:px-8">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white lg:text-lg">
              {title}
            </h2>
            {description ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {action ? <div className="flex items-center">{action}</div> : null}

          {/* User card estilo Google */}
          <button
            aria-label="Abrir ajustes"
            className="group flex items-center gap-2.5 rounded-full border border-slate-200/70 py-1 pl-1.5 pr-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
            onClick={() => router.push("/ajustes")}
            type="button"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              {userInitials}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="max-w-[130px] truncate text-xs font-semibold text-slate-800 dark:text-white">
                {user?.full_name ?? "Usuario"}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">
              expand_more
            </span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          <ThemeToggleButton />

          <Link
            href="/dashboard/notificaciones"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Ver notificaciones"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </Link>

          <button
            aria-label="Cerrar sesión"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
            onClick={handleLogout}
            type="button"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>
    </>
  );
}
