"use client";

import type { FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import BrandLogo from "./components/BrandLogo";
import { setSessionUser } from "./lib/session";

export default function Home() {
  const router = useRouter();

  const loginEndpoints = [
    "/api/login/",
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL.replace(/\/$/, "")}/api/login/`
      : null,
    process.env.NEXT_PUBLIC_USE_NEXT_AUTH_PROXY === "true" ? "/api/auth/login/" : null,
  ].filter((endpoint): endpoint is string => Boolean(endpoint));

  const performLogin = async (email: string, password: string) => {
    let lastError = "No se pudo iniciar sesión.";

    for (const endpoint of loginEndpoints) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const responseText = await response.text();
      const payload = contentType.includes("application/json")
        ? JSON.parse(responseText)
        : null;

      if (response.ok) {
        return payload ?? {};
      }

      if (response.status !== 404) {
        if (payload && typeof payload === "object" && "error" in payload) {
          const backendError = payload.error;
          if (typeof backendError === "string" && backendError.trim()) {
            lastError = backendError;
          }
        }

        break;
      }
    }

    throw new Error(lastError);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    const password = String(formData.get("password") ?? "");

    try {
      const payload = await performLogin(email, password);

      if (payload.user) {
        setSessionUser(payload.user);
      } else if (email) {
        setSessionUser({ email });
      }

      router.push("/dashboard");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background-light font-display antialiased transition-colors duration-300 dark:bg-background-dark">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#93c5fd_0%,#86efac_38%,rgba(245,247,251,0)_68%)] dark:bg-[radial-gradient(circle_at_top,#1d4ed8_0%,#166534_42%,rgba(10,15,20,0)_70%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-[460px] flex-col items-center gap-8">
          <BrandLogo size="xxl" className="scale-[1.3]" />
          <div className="w-full rounded-3xl border border-white/60 bg-white/90 p-8 shadow-[0_25px_80px_-24px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-[#121923]/90 dark:shadow-black/40 sm:p-10">
            <div className="mb-6 space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bienvenido de nuevo</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Inicia sesión para gestionar tus operaciones de Trust.
              </p>
            </div>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="block text-slate-800 dark:text-slate-200 text-sm font-bold"
                  htmlFor="email"
                >
                  Correo electrónico
                </label>
                <input
                  className="form-input block h-14 w-full rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 shadow-input transition-all duration-200 ease-in-out focus:border-professional-green focus:ring-professional-green dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  id="email"
                  name="email"
                  placeholder="usuario@empresa.com"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="block text-slate-800 dark:text-slate-200 text-sm font-bold"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <input
                  className="form-input block h-14 w-full rounded-xl border-slate-200 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 shadow-input transition-all duration-200 ease-in-out focus:border-professional-green focus:ring-professional-green dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
              <button
                className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-bold leading-normal tracking-wide text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-yellow-500 hover:shadow-primary/30 active:scale-[0.98]"
                type="submit"
              >
                Iniciar Sesión
              </button>
            </form>
          </div>
          <div className="space-y-2 text-center text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            <p>
              Al continuar, aceptas nuestros{" "}
              <Link className="font-semibold text-primary hover:underline" href="/terminos-condiciones">
                Términos y Condiciones
              </Link>
              {" "}y la{" "}
              <Link className="font-semibold text-primary hover:underline" href="/politica-privacidad">
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
