"use client";

import type { FormEvent, MouseEvent } from "react";
import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import AlertBanner from "./components/AlertBanner";
import BrandLogo from "./components/BrandLogo";
import { setSessionUser } from "./lib/session";

const EMAIL_AUTHORIZATION_CODES = new Set([
  "email_not_authorized",
  "email_unauthorized",
  "gmail_not_authorized",
  "gmail_unauthorized",
  "mailbox_not_authorized",
]);

class LoginRequestError extends Error {
  status: number;
  code?: string;
  authorizeUrl?: string;

  constructor(message: string, status: number, code?: string, authorizeUrl?: string) {
    super(message);
    this.name = "LoginRequestError";
    this.status = status;
    this.code = code;
    this.authorizeUrl = authorizeUrl;
  }
}

const parseLoginError = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return { code: undefined, authorizeUrl: undefined, requiresEmailAuthorization: false };
  }

  const record = payload as Record<string, unknown>;
  const rawCode = record.code ?? record.error_code;
  const code = typeof rawCode === "string" ? rawCode.toLowerCase() : undefined;
  const authorizeUrl =
    typeof record.authorize_url === "string"
      ? record.authorize_url
      : typeof record.authorizeUrl === "string"
        ? record.authorizeUrl
        : undefined;
  const requiresEmailAuthorization =
    record.requires_email_authorization === true ||
    (code ? EMAIL_AUTHORIZATION_CODES.has(code) : false);

  return { code, authorizeUrl, requiresEmailAuthorization };
};

const isEmailAuthorizationError = (error: unknown) => {
  if (!(error instanceof LoginRequestError)) return false;
  if (error.code && EMAIL_AUTHORIZATION_CODES.has(error.code)) return true;
  return /(correo|email|gmail|cuenta).*(no (está|esta) autoriz|sin autoriz|autorizaci[oó]n pendiente)/i.test(
    error.message,
  );
};

export default function Home() {
  const router = useRouter();
  const [loginError, setLoginError] = useState<{
    message: string;
    needsEmailAuthorization: boolean;
    authorizeUrl?: string;
  } | null>(null);

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
    let lastStatus = 0;
    let lastCode: string | undefined;
    let lastAuthorizeUrl: string | undefined;
    let lastRequiresEmailAuthorization = false;

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

        const parsedError = parseLoginError(payload);
        lastStatus = response.status;
        lastCode = parsedError.code;
        lastAuthorizeUrl = parsedError.authorizeUrl;
        lastRequiresEmailAuthorization = parsedError.requiresEmailAuthorization;
        break;
      }
    }

    throw new LoginRequestError(
      lastError,
      lastStatus,
      lastRequiresEmailAuthorization ? "email_not_authorized" : lastCode,
      lastAuthorizeUrl,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    const password = String(formData.get("password") ?? "");

    setLoginError(null);

    try {
      const payload = await performLogin(email, password);

      if (payload.user) {
        setSessionUser(payload.user);
      } else if (email) {
        setSessionUser({ email });
      }

      router.push("/dashboard");
    } catch (error) {
      const needsEmailAuthorization = isEmailAuthorizationError(error);
      setLoginError({
        message:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesión.",
        needsEmailAuthorization,
        authorizeUrl:
          error instanceof LoginRequestError ? error.authorizeUrl : undefined,
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background-light font-display antialiased transition-colors duration-300 dark:bg-background-dark">
      <div className="login-lights-layer login-lights-intro login-lights-motion pointer-events-none absolute inset-0" />
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
            {loginError ? (
              <AlertBanner
                actionLabel={loginError.needsEmailAuthorization ? "Autorizar cuenta" : undefined}
                className="mb-5"
                dismissible
                key={`${loginError.message}-${loginError.needsEmailAuthorization}`}
                message={
                  loginError.needsEmailAuthorization
                    ? "La cuenta de correo no está autorizada para enviar notificaciones. Autoriza Gmail para reanudar el envío de correos."
                    : loginError.message
                }
                onAction={
                  loginError.needsEmailAuthorization
                    ? () => {
                        window.location.assign(
                          loginError.authorizeUrl ?? "/api/gmail/authorize/",
                        );
                      }
                    : undefined
                }
                type={loginError.needsEmailAuthorization ? "warning" : "error"}
              />
            ) : null}
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
