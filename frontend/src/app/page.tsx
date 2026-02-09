"use client";

import type { FormEvent } from "react";

import { useRouter } from "next/navigation";

import BrandLogo from "./components/BrandLogo";

export default function Home() {
  const router = useRouter();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-center p-4 antialiased transition-colors duration-300">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-10">
        <BrandLogo size="xl" />
        <div className="w-full bg-white dark:bg-[#161e27] rounded-2xl shadow-card dark:shadow-black/60 border border-slate-100 dark:border-slate-800 p-8 sm:p-10 flex flex-col gap-6">
          <div className="space-y-2 text-center">
            <h2 className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">
              Inicia sesión para gestionar tus mantenimientos
            </p>
          </div>
          <form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="block text-slate-800 dark:text-slate-200 text-sm font-bold"
                htmlFor="email"
              >
                Correo electrónico
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">
                    mail
                  </span>
                </span>
                <input
                  className="form-input block w-full pl-10 pr-4 h-14 rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus:border-professional-green focus:ring-professional-green shadow-input transition-all duration-200 ease-in-out"
                  id="email"
                  placeholder="usuario@empresa.com"
                  required
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="block text-slate-800 dark:text-slate-200 text-sm font-bold"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <a
                  className="text-xs font-semibold text-professional-green hover:underline transition-all"
                  href="#"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-[20px]">
                    lock
                  </span>
                </span>
                <input
                  className="form-input block w-full pl-10 pr-4 h-14 rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus:border-professional-green focus:ring-professional-green shadow-input transition-all duration-200 ease-in-out"
                  id="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>
            <button
              className="mt-2 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-primary hover:bg-yellow-500 text-slate-900 text-sm font-bold leading-normal tracking-wide shadow-lg shadow-yellow-500/10 transition-all duration-200 active:scale-[0.98]"
              type="submit"
            >
              Iniciar Sesión
            </button>
          </form>
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>
          <div className="text-center">
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              ¿No tienes cuenta?{" "}
            </span>
            <a
              className="text-professional-green dark:text-primary text-sm font-bold hover:underline transition-all"
              href="#"
            >
              Contacta al Administrador
            </a>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400 dark:text-slate-600 font-medium">
          <a
            className="hover:text-professional-green dark:hover:text-primary transition-colors"
            href="#"
          >
            Política de Privacidad
          </a>
          <a
            className="hover:text-professional-green dark:hover:text-primary transition-colors"
            href="#"
          >
            Términos de Servicio
          </a>
          <a
            className="hover:text-professional-green dark:hover:text-primary transition-colors"
            href="#"
          >
            Centro de Ayuda
          </a>
        </div>
      </div>
    </div>
  );
}
