"use client";

import type { FormEvent } from "react";

import { useRouter } from "next/navigation";

import BrandLogo from "./components/BrandLogo";

const SESSION_USER_KEY = "trust.currentUser";

export default function Home() {
  const router = useRouter();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (email) {
      window.localStorage.setItem(
        SESSION_USER_KEY,
        JSON.stringify({ email }),
      );
    }

    router.push("/dashboard");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col items-center justify-center p-4 antialiased transition-colors duration-300">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-8">
        <BrandLogo size="xxl" />
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
      </div>
    </div>
  );
}
