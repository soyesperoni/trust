"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { clearSessionUser } from "../lib/session";

type SessionExpiredModalProps = {
  open: boolean;
  message?: string;
  onRedirect?: () => void;
};

export default function SessionExpiredModal({
  open,
  message = "Tu sesión expiró por inactividad. Inicia sesión nuevamente para continuar.",
  onRedirect,
}: SessionExpiredModalProps) {
  const router = useRouter();
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    loginButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        loginButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const handleRedirect = () => {
    clearSessionUser();
    if (onRedirect) {
      onRedirect();
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <div
      aria-labelledby="session-expired-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#161e27] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
            <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg font-bold text-slate-900 dark:text-white"
              id="session-expired-title"
            >
              Sesión expirada
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            onClick={handleRedirect}
            ref={loginButtonRef}
            type="button"
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
