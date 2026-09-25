"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getSessionUserEmail } from "../lib/session";

type SupportTicketApi = {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reporter_name: string;
  reporter_email: string;
  vida_ticket_id?: number | null;
  vida_ticket_number?: string | null;
  attachments?: any[];
  resolution_notes?: string;
  created_at: string | null;
  updated_at: string | null;
};

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "sistema", label: "Sistema & Dashboard" },
  { value: "dosificadores", label: "Dosificadores & Equipos" },
  { value: "auditorias", label: "Auditorías & Formularios" },
  { value: "clientes", label: "Clientes & Sucursales" },
  { value: "mejora", label: "Mejora & Solicitud Técnica" },
];

const PRIORITIES = [
  { value: "low", label: "Baja", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
  { value: "medium", label: "Media", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-900" },
  { value: "high", label: "Alta", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900" },
  { value: "urgent", label: "Urgente", color: "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-900" },
];

const STATUS_MAP: Record<string, { label: string; badgeClass: string; icon: string }> = {
  pending_validation: {
    label: "Pendiente",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    icon: "schedule",
  },
  in_director: {
    label: "En Resolución",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    icon: "engineering",
  },
  completed: {
    label: "Resuelto",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    icon: "check_circle",
  },
  rejected: {
    label: "Descartado",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    icon: "cancel",
  },
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return { date: "Sin fecha", time: "" };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { date: "Sin fecha", time: "" };
  return {
    date: d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" }),
  };
};

export default function SupportPage() {
  const { user } = useCurrentUser();
  const [tickets, setTickets] = useState<SupportTicketApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketApi | null>(null);

  // Formulario de creación
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUserEmail = getSessionUserEmail();
      const res = await fetch("/api/support/tickets/", {
        cache: "no-store",
        headers: { "x-current-user-email": currentUserEmail },
      });
      if (!res.ok) {
        throw new Error("No se pudo cargar el listado de tickets.");
      }
      const data = await res.json();
      setTickets(data.results || []);
    } catch (err: any) {
      setError(err?.message || "Error al conectar con el servicio de soporte.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("El título de la petición es obligatorio.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("La descripción técnica es obligatoria.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const currentUserEmail = getSessionUserEmail();
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        priority: formPriority,
        reporter_name: user?.full_name || "Usuario",
        reporter_email: user?.email || currentUserEmail || "",
      };

      const res = await fetch("/api/support/tickets/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": currentUserEmail,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Error al registrar la petición.");
      }

      const created = await res.json();
      setTickets((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setFormTitle("");
      setFormDescription("");
      setFormCategory("general");
      setFormPriority("medium");
    } catch (err: any) {
      setFormError(err?.message || "Ocurrió un error al enviar el ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNum = t.ticket_number.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        if (!matchTitle && !matchNum && !matchDesc) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, searchTerm]);

  // Contadores
  const countTotal = tickets.length;
  const countPending = tickets.filter((t) => t.status === "pending_validation").length;
  const countInProgress = tickets.filter((t) => t.status === "in_director").length;
  const countCompleted = tickets.filter((t) => t.status === "completed").length;

  return (
    <PageTransition>
      <div className="flex h-full flex-col overflow-y-auto">
        <DashboardHeader
          title="Soporte Técnico"
          description="Gestión de peticiones técnicas, soporte operativo y seguimiento de requerimientos."
          action={
            <button
              onClick={() => {
                setFormError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nueva Petición</span>
            </button>
          }
        />

        <div className="flex-1 space-y-6 p-4 md:p-6">
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Tickets
                </span>
                <span className="material-symbols-outlined text-slate-400 text-[20px]">confirmation_number</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{countTotal}</p>
              <span className="text-xs text-slate-500">Registrados en la plataforma</span>
            </div>

            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Pendientes
                </span>
                <span className="material-symbols-outlined text-amber-500 text-[20px]">schedule</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{countPending}</p>
              <span className="text-xs text-amber-600 dark:text-amber-400/80">Por revisión inicial</span>
            </div>

            <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 shadow-sm dark:border-blue-900/30 dark:bg-blue-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  En Resolución
                </span>
                <span className="material-symbols-outlined text-blue-500 text-[20px]">engineering</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">{countInProgress}</p>
              <span className="text-xs text-blue-600 dark:text-blue-400/80">En proceso de atención</span>
            </div>

            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Resueltos
                </span>
                <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{countCompleted}</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400/80">Concluidos exitosamente</span>
            </div>
          </div>

          {/* Filtros y Búsqueda */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#161e27] sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, asunto o detalle..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <option value="all">Todos los estados</option>
                <option value="pending_validation">Pendientes</option>
                <option value="in_director">En Resolución</option>
                <option value="completed">Resueltos</option>
                <option value="rejected">Descartados</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <button
                onClick={loadTickets}
                title="Actualizar listado"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            </div>
          </div>

          {/* Listado de Tickets */}
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#161e27]">
              <span className="material-symbols-outlined animate-spin text-3xl text-blue-600">sync</span>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cargando tickets de soporte...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
              <span className="material-symbols-outlined text-3xl text-red-500">error</span>
              <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={loadTickets}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-[#161e27]">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                inbox
              </span>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                No hay peticiones de soporte registradas
              </p>
              <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                Si requieres asistencia técnica, ajustes de funcionalidad o resolución de incidencias, crea una nueva petición desde el botón superior.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredTickets.map((ticket) => {
                const statusInfo = STATUS_MAP[ticket.status] || {
                  label: ticket.status,
                  badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
                  icon: "info",
                };
                const prioInfo = PRIORITIES.find((p) => p.value === ticket.priority) || PRIORITIES[1];
                const catLabel = CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category;
                const { date, time } = formatDate(ticket.created_at);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-[#161e27] dark:hover:border-blue-900 cursor-pointer sm:flex-row sm:items-center"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {ticket.ticket_number}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.badgeClass}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${prioInfo.color}`}
                        >
                          {prioInfo.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {catLabel}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {ticket.title}
                      </h3>

                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:flex-col sm:items-end sm:gap-1">
                      <div className="text-right text-xs text-slate-400">
                        <span>{date}</span>
                        {time && <span className="ml-1.5 font-mono">{time}</span>}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        Por: {ticket.reporter_name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Crear Ticket */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#161e27]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[22px]">
                    confirmation_number
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Nueva Petición de Soporte
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Título del requerimiento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej: Corrección en registro de dosificadores en sucursal..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Categoría
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Prioridad
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Descripción técnica del requerimiento *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe los pasos para reproducir el problema, el comportamiento esperado o las especificaciones del ajuste requerido..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <span>Registrar Petición</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Detalle del Ticket */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#161e27]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {selectedTicket.ticket_number}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        STATUS_MAP[selectedTicket.status]?.badgeClass || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {STATUS_MAP[selectedTicket.status]?.icon || "info"}
                      </span>
                      {STATUS_MAP[selectedTicket.status]?.label || selectedTicket.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedTicket.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/50">
                  <div>
                    <span className="text-slate-400">Categoría:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {CATEGORIES.find((c) => c.value === selectedTicket.category)?.label || selectedTicket.category}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Prioridad:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {PRIORITIES.find((p) => p.value === selectedTicket.priority)?.label || selectedTicket.priority}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Reportado por:</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {selectedTicket.reporter_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Fecha de registro:</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {formatDate(selectedTicket.created_at).date} {formatDate(selectedTicket.created_at).time}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    Descripción del Requerimiento
                  </h4>
                  <div className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3.5 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                    {selectedTicket.description}
                  </div>
                </div>

                {selectedTicket.resolution_notes && (
                  <div>
                    <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Informe de Resolución Técnica
                    </h4>
                    <div className="mt-1.5 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-slate-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-slate-200">
                      {selectedTicket.resolution_notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
