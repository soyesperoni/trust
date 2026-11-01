"use client";

import AlertBanner from "./AlertBanner";

type PdfUnavailableEntity = "visita" | "auditoria";

type PdfUnavailableNoticeProps = {
  isRegistered: boolean;
  entity?: PdfUnavailableEntity;
  onRetry?: () => void;
  className?: string;
};

export default function PdfUnavailableNotice({
  isRegistered,
  entity = "visita",
  onRetry,
  className = "",
}: PdfUnavailableNoticeProps) {
  if (isRegistered) return null;

  const subject = entity === "auditoria" ? "la auditoría" : "la visita";

  return (
    <AlertBanner
      actionLabel={onRetry ? "Reintentar" : undefined}
      className={className}
      dismissible={false}
      message={`El informe PDF no está disponible porque ${subject} todavía no está registrada. Completa y guarda el registro para habilitar la descarga.`}
      onAction={onRetry}
      type="warning"
    />
  );
}
