"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../../../../components/DashboardHeader";
import { getSessionUserEmail } from "../../../../lib/session";

type IncidentMedia = { id: number; type: string; file: string | null };
type IncidentDetail = {
  id: number;
  client: string;
  branch: string;
  area: string;
  dispenser: string;
  description: string;
  created_at: string;
  media: IncidentMedia[];
};

const toAbsoluteMediaUrl = (value: string | null) => {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
  return `${backendUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const currentUserEmail = getSessionUserEmail();
        const response = await fetch(`/api/incidents/${params.id}/`, {
          cache: "no-store",
          headers: { "x-current-user-email": currentUserEmail },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "No se pudo cargar la incidencia.");
        if (!isMounted) return;
        setIncident(data);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar la incidencia.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (params.id) load();
    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const photos = useMemo(() => (incident?.media ?? []).filter((m) => m.type === "photo" && m.file), [incident]);
  const videos = useMemo(() => (incident?.media ?? []).filter((m) => m.type === "video" && m.file), [incident]);

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Detalle de la incidencia" description="Información general y evidencias adjuntas." />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
        <Link className="text-sm text-slate-600 hover:text-slate-900" href="/clientes/incidencias">← Volver a incidencias</Link>
        {isLoading ? <p>Cargando...</p> : null}
        {error ? <p className="text-red-600">{error}</p> : null}
        {incident ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
              <h2 className="font-semibold text-lg mb-3">Información general</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <p><strong>ID:</strong> #{incident.id}</p>
                <p><strong>Cliente:</strong> {incident.client}</p>
                <p><strong>Sucursal:</strong> {incident.branch}</p>
                <p><strong>Área:</strong> {incident.area}</p>
                <p><strong>Dosificador:</strong> {incident.dispenser}</p>
                <p><strong>Creación:</strong> {new Date(incident.created_at).toLocaleString("es-BO")}</p>
              </div>
              <p className="text-sm mt-4"><strong>Descripción:</strong> {incident.description || "Sin descripción"}</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
              <h2 className="font-semibold text-lg mb-3">Evidencias fotográficas</h2>
              {photos.length === 0 ? (
                <p className="text-sm text-slate-500">No hay fotos registradas.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {photos.map((media) => {
                    const mediaUrl = toAbsoluteMediaUrl(media.file);
                    return mediaUrl ? <img key={media.id} alt={`evidencia-${media.id}`} className="w-full rounded-lg border" src={mediaUrl} /> : null;
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6">
              <h2 className="font-semibold text-lg mb-3">Evidencias en video</h2>
              {videos.length === 0 ? (
                <p className="text-sm text-slate-500">No hay videos registrados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {videos.map((media) => {
                    const mediaUrl = toAbsoluteMediaUrl(media.file);
                    return mediaUrl ? <video key={media.id} className="w-full rounded-lg border bg-black" controls src={mediaUrl} /> : null;
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
