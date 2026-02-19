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
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-center p-4 antialiased transition-colors duration-300">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-8">
        <BrandLogo size="xxl" showSupplyLogo />
        <div className="w-full bg-white dark:bg-[#161e27] rounded-2xl shadow-card dark:shadow-black/60 border border-slate-100 dark:border-slate-800 p-8 sm:p-10">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="block text-slate-800 dark:text-slate-200 text-sm font-bold"
                htmlFor="email"
              >
                Correo electrónico
              </label>
              <input
                className="form-input block w-full px-4 h-14 rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus:border-professional-green focus:ring-professional-green shadow-input transition-all duration-200 ease-in-out"
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
                className="form-input block w-full px-4 h-14 rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus:border-professional-green focus:ring-professional-green shadow-input transition-all duration-200 ease-in-out"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
              />
            </div>
            <button
              className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-primary hover:bg-yellow-500 text-slate-900 text-sm font-bold leading-normal tracking-wide shadow-lg shadow-yellow-500/10 transition-all duration-200 active:scale-[0.98]"
              type="submit"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
        <div className="text-center space-y-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
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
          <p className="text-[11px] sm:text-xs">by SupplyMax de Panamá</p>
        </div>
      </div>
    </div>
  );
}
