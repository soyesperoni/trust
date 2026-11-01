"use client";

import { useState } from "react";

export type AlertBannerType = "info" | "warning" | "error";

type AlertBannerProps = {
  type: AlertBannerType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  className?: string;
};

const alertStyles: Record<
  AlertBannerType,
  { container: string; icon: string; action: string; dismiss: string }
> = {
  info: {
    container:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100",
    icon: "text-sky-600 dark:text-sky-300",
    action:
      "bg-sky-700 text-white hover:bg-sky-800 focus-visible:outline-sky-700 dark:bg-sky-500 dark:text-sky-950 dark:hover:bg-sky-400",
    dismiss: "text-sky-700 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900/50",
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-300",
    action:
      "bg-amber-700 text-white hover:bg-amber-800 focus-visible:outline-amber-700 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300",
    dismiss: "text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50",
  },
  error: {
    container:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
    icon: "text-red-600 dark:text-red-300",
    action:
      "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-400",
    dismiss: "text-red-700 hover:bg-red-100 dark:text-red-200 dark:hover:bg-red-900/50",
  },
};

const AlertIcon = ({ type, className }: { type: AlertBannerType; className: string }) => {
  if (type === "error") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9.5 9.5 5 5m0-5-5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (type === "warning") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
        <path
          d="M10.3 4.1 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M12 9v4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="12" cy="17" fill="currentColor" r="1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="8" fill="currentColor" r="1" />
    </svg>
  );
};

export default function AlertBanner({
  type,
  message,
  actionLabel,
  onAction,
  dismissible = false,
  className = "",
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const styles = alertStyles[type];

  if (!isVisible) return null;

  return (
    <div
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xs sm:flex-row sm:items-center ${styles.container} ${className}`}
      role={type === "error" ? "alert" : "status"}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <AlertIcon className={`mt-0.5 h-5 w-5 shrink-0 sm:mt-0 ${styles.icon}`} type={type} />
        <p className="min-w-0 leading-6">{message}</p>
      </div>

      {(actionLabel && onAction) || dismissible ? (
        <div className="flex shrink-0 items-center justify-end gap-2 pl-8 sm:pl-0">
          {actionLabel && onAction ? (
            <button
              className={`inline-flex min-h-9 items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${styles.action}`}
              onClick={onAction}
              type="button"
            >
              {actionLabel}
            </button>
          ) : null}

          {dismissible ? (
            <button
              aria-label="Cerrar aviso"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${styles.dismiss}`}
              onClick={() => setIsVisible(false)}
              type="button"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
