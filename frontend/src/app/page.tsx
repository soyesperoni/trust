"use client";

import type { FormEvent, MouseEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import BrandLogo from "./components/BrandLogo";
import { setSessionUser } from "./lib/session";

export default function Home() {
  const router = useRouter();

  const handleLoginButtonMouseMove = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();

    button.style.setProperty("--cursor-x", `${event.clientX - bounds.left}px`);
    button.style.setProperty("--cursor-y", `${event.clientY - bounds.top}px`);
  };

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
      <div className="login-lights-intro pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.62)_0%,rgba(146,185,59,0.48)_36%,rgba(245,247,251,0)_68%)] dark:bg-[radial-gradient(circle_at_50%_118%,rgba(46,49,146,0.5)_0%,rgba(146,185,59,0.32)_38%,rgba(10,15,20,0)_68%)]" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="flex w-full max-w-[322px] flex-col items-center gap-10">
          <BrandLogo size="xxl" className="login-logo-intro mb-4 scale-[1.56]" />
          <div className="login-content-intro w-full rounded-3xl border border-white/60 bg-white/65 p-6 shadow-[0_25px_80px_-24px_rgba(15,23,42,0.32)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/55 dark:shadow-black/35 sm:p-7">
            <div className="mb-6 space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bienvenido de nuevo</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Inicia sesión para continuar.
              </p>
            </div>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <input
                  className="form-input block h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-sm placeholder:text-slate-400 shadow-input transition-all duration-200 ease-in-out focus:border-professional-green focus:ring-professional-green dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  id="email"
                  name="email"
                  aria-label="Correo electrónico"
                  placeholder="Correo electrónico"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <input
                  className="form-input block h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-sm placeholder:text-slate-400 shadow-input transition-all duration-200 ease-in-out focus:border-professional-green focus:ring-professional-green dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  id="password"
                  name="password"
                  aria-label="Contraseña"
                  placeholder="Contraseña"
                  required
                  type="password"
                />
              </div>
              <button
                className="login-submit-button mt-2 flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-bold leading-normal tracking-wide text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-primary/30 active:scale-[0.98]"
                onMouseMove={handleLoginButtonMouseMove}
                type="submit"
              >
                Iniciar Sesión
              </button>
            </form>
          </div>
          <div className="login-content-intro rounded-xl bg-white/65 px-4 py-2 text-center text-xs text-slate-700 shadow-sm backdrop-blur-sm dark:bg-slate-900/55 dark:text-slate-200 sm:text-sm">
            <p>
              Al continuar, aceptas nuestros{" "}
              <Link className="font-semibold text-primary/95 hover:underline" href="/terminos-condiciones">
                Términos y Condiciones
              </Link>
              {" "}y la{" "}
              <Link className="font-semibold text-primary/95 hover:underline" href="/politica-privacidad">
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
