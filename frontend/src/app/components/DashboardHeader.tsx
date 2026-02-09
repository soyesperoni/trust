"use client";

import type { ChangeEvent } from "react";

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
          <button className="p-2 relative text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>
    </>
  );
}
