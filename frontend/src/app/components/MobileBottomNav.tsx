"use client";

import Link from "next/link";

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
  { label: "Visitas", href: "/clientes/visitas", icon: "history" },
  { label: "Incidencias", href: "/clientes/incidencias", icon: "report_problem" },
];

export default function MobileBottomNav({ activePath }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 md:hidden dark:border-slate-800 dark:bg-[#161e27]/95">
      <div className="grid grid-cols-4 gap-1">
        {mobileItems.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-1 transition-colors"
            >
              <div
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                <span className={`material-symbols-outlined text-[22px] ${isActive ? "filled" : ""}`}>
                  {item.icon}
                </span>
              </div>
              <span
                className={`mt-1 text-[11px] leading-tight transition-colors ${
                  isActive
                    ? "font-semibold text-blue-600 dark:text-blue-400"
                    : "font-medium text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
