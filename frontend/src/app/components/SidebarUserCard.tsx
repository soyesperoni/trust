"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  id: number;
  full_name: string;
  role_label: string;
  is_active: boolean;
};

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
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar el usuario.");
        }
        const data = await response.json();
        if (!isMounted) return;
        const results = (data.results ?? []) as CurrentUser[];
        const currentUser =
          results.find((candidate) => candidate.is_active) ?? results[0] ?? null;
        setUser(currentUser);
        setStatus("idle");
      } catch (error) {
        if (!isMounted) return;
        setStatus("error");
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    if (!user?.full_name) return "?";
    return getInitials(user.full_name);
  }, [user]);

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold">
          {initials}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {user?.full_name ??
              (status === "error"
                ? "Usuario no disponible"
                : "Cargando usuario...")}
          </span>
          <span className="text-xs text-slate-500">
            {user?.role_label ?? (status === "error" ? "-" : " ")}
          </span>
        </div>
      </div>
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
