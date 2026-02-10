"use client";

import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";

type CurrentUser = {
  id: number;
  full_name: string;
  email?: string;
  role_label: string;
  is_active: boolean;
};

const SESSION_USER_KEY = "trust.currentUser";

const FALLBACK_USER: CurrentUser = {
  id: 0,
  full_name: "Admin Global",
  email: "admin@trust.com",
  role_label: "Administrador",
  is_active: true,
};

export default function AjustesPage() {
  const [user, setUser] = useState<CurrentUser>(FALLBACK_USER);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");

  useEffect(() => {
    let isMounted = true;

    const sessionUserRaw = window.localStorage.getItem(SESSION_USER_KEY);
    let sessionUser: CurrentUser | null = null;

    if (sessionUserRaw) {
      try {
        sessionUser = JSON.parse(sessionUserRaw) as CurrentUser;
      } catch {
        window.localStorage.removeItem(SESSION_USER_KEY);
      }
    }

    const loadCurrentUser = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("No se pudo cargar el usuario actual.");
        }

        const data = await response.json();
        const users = (data.results ?? []) as CurrentUser[];
        const sessionEmail = sessionUser?.email ?? null;
        const currentUser =
          (sessionEmail
            ? users.find((candidate) => candidate.email === sessionEmail)
            : null) ??
          users.find((candidate) => candidate.is_active) ??
          users[0] ??
          FALLBACK_USER;

        if (!isMounted) return;
        setUser(currentUser);
        setStatus("idle");
      } catch {
        if (!isMounted) return;
        setStatus("error");
      }
    };

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const isLoading = status === "loading";
  const statusMessage = useMemo(() => {
    if (status === "error") {
      return "No se pudo cargar la información más reciente. Mostrando datos de respaldo.";
    }
    if (isLoading) {
      return "Cargando datos de tu perfil...";
    }
    return null;
  }, [isLoading, status]);

  return (
    <>
      <DashboardHeader
        title="Ajustes de Usuario"
        description="Administra tu información de perfil y credenciales de acceso."
      />

      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto w-full max-w-4xl space-y-8">
          {statusMessage && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              {statusMessage}
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <div className="border-b border-slate-100 p-6 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-professional-green">
                  person
                </span>
                Información del Perfil
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Actualiza tu información personal y foto de perfil.
              </p>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col items-start gap-8 md:flex-row">
                <div className="w-full shrink-0 md:w-auto">
                  <div className="flex flex-col items-center gap-4">
                    <div className="group relative">
                      <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200 dark:border-slate-800">
                        <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-700">
                          {user.full_name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase() || "?"}
                        </div>
                      </div>
                      <button
                        className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-slate-900 shadow-lg transition-colors hover:bg-yellow-400"
                        title="Cambiar foto"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    </div>
                    <span className="text-xs text-slate-400">JPG, GIF o PNG. Max 1MB.</span>
                  </div>
                </div>

                <div className="w-full flex-1 space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="fullName">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                          badge
                        </span>
                        <input
                          className="w-full rounded-lg border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm text-slate-800 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-200"
                          defaultValue={user.full_name}
                          id="fullName"
                          placeholder="Ej. Juan Pérez"
                          type="text"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                          mail
                        </span>
                        <input
                          className="w-full cursor-not-allowed rounded-lg border-slate-200 bg-slate-50 px-4 py-2.5 pl-10 text-sm text-slate-500 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-400"
                          defaultValue={user.email ?? "Sin correo"}
                          id="email"
                          readOnly
                          type="email"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Contacta a soporte para cambiar tu email.</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="role">
                        Rol
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                          security
                        </span>
                        <input
                          className="w-full rounded-lg border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm text-slate-800 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-200"
                          defaultValue={user.role_label}
                          id="role"
                          readOnly
                          type="text"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <div className="border-b border-slate-100 p-6 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <span className="material-symbols-outlined text-professional-green">lock</span>
                Seguridad
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Gestiona tu contraseña y preferencias de seguridad.
              </p>
            </div>
            <div className="p-6 md:p-8">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
                Actualizar Contraseña
              </h4>
              <div className="grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="currentPassword">
                    Contraseña Actual
                  </label>
                  <input
                    className="w-full rounded-lg border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-200"
                    id="currentPassword"
                    placeholder="••••••••••••"
                    type="password"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="newPassword">
                    Nueva Contraseña
                  </label>
                  <input
                    className="w-full rounded-lg border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-200"
                    id="newPassword"
                    placeholder="••••••••••••"
                    type="password"
                  />
                  <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="confirmPassword">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    className="w-full rounded-lg border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-200"
                    id="confirmPassword"
                    placeholder="••••••••••••"
                    type="password"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
              <button className="px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-300 dark:hover:text-white" type="button">
                Cancelar
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-professional-green px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800" type="button">
                <span className="material-symbols-outlined text-[18px]">save</span>
                Guardar Cambios
              </button>
            </div>
          </section>
        </div>
      </PageTransition>
    </>
  );
}
