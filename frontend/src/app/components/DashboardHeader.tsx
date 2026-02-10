"use client";

import type { ChangeEvent } from "react";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  fetchNotificationIds,
  getUnreadNotificationCount,
  NOTIFICATIONS_UPDATED_EVENT,
} from "../lib/notifications";

import BrandLogo from "./BrandLogo";
import ThemeToggleButton from "./ThemeToggleButton";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function DashboardHeader({
  title,
  description,
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
}: DashboardHeaderProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(event.target.value);
  };


  const [unreadCount, setUnreadCount] = useState(0);

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

    const handleNotificationsUpdate = () => {
      loadUnreadCount();
    };

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleNotificationsUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        handleNotificationsUpdate,
      );
    };
  }, []);

  const searchProps = {
    className:
      "pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary",
    placeholder: searchPlaceholder,
    type: "text",
  } as const;

  return (
    <>
      <header className="h-16 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:hidden">
        <BrandLogo size="lg" />
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      <header className="h-20 bg-white dark:bg-[#161e27] border-b border-slate-200 dark:border-slate-800 hidden md:flex items-center justify-between px-8">
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
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
              search
            </span>
            <input
              {...searchProps}
              onChange={onSearchChange ? handleSearchChange : undefined}
              value={typeof searchValue === "string" ? searchValue : undefined}
            />
          </div>
          <ThemeToggleButton />
          <Link
            href="/dashboard/notificaciones"
            className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Ver notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] leading-5 text-center font-semibold border-2 border-white dark:border-[#161e27]">
                {unreadCount}
              </span>
            ) : null}
          </Link>
        </div>
      </header>
    </>
  );
}
