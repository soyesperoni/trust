"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { getSessionUserEmail } from "../lib/session";

type Attachment = {
  name: string;
  url: string;
  size?: number;
  content_type?: string;
};

type SupportTicketApi = {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  target_system: "platform" | "mobile" | "both" | string;
  priority: string;
  status: string;
  reporter_name: string;
  reporter_email: string;
  vida_ticket_id?: number | null;
  vida_ticket_number?: string | null;
  attachments?: Attachment[];
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

const TARGET_SYSTEMS = [
  {
    value: "platform",
    label: "Plataforma Web",
    icon: "laptop_mac",
    description: "Navegador, dashboard, módulos y administración",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  },
  {
    value: "mobile",
    label: "App Móvil",
    icon: "smartphone",
    description: "Aplicación móvil para técnicos e inspectores en campo",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  },
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

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [targetSystemFilter, setTargetSystemFilter] = useState<string>("all");

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketApi | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<number | null>(null);

  // Formulario de creación
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTargetSystem, setFormTargetSystem] = useState<"platform" | "mobile">("platform");
  const [formPriority, setFormPriority] = useState("medium");
  const [formDescription, setFormDescription] = useState("");
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFormFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFormFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("El título de la petición es obligatorio.");
      return;
    }
    if (!formDescription.trim()) {
      setFormError("La descripción del requerimiento es obligatoria.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const currentUserEmail = getSessionUserEmail();
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      formData.append("description", formDescription.trim());
      formData.append("category", formCategory);
      formData.append("target_system", formTargetSystem);
      formData.append("priority", formPriority);
      formData.append("reporter_name", user?.full_name || "Usuario");
      formData.append("reporter_email", user?.email || currentUserEmail || "");

      // Adjuntar archivos seleccionados
      formFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/support/tickets/", {
        method: "POST",
        headers: {
          "x-current-user-email": currentUserEmail,
        },
        body: formData,
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
      setFormTargetSystem("platform");
      setFormPriority("medium");
      setFormFiles([]);
    } catch (err: any) {
      setFormError(err?.message || "Ocurrió un error al enviar el ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTicket = async (ticketId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar esta petición de soporte?")) {
      return;
    }

    setDeletingTicketId(ticketId);
    try {
      const currentUserEmail = getSessionUserEmail();
      const res = await fetch(`/api/support/tickets/?id=${ticketId}`, {
        method: "DELETE",
        headers: { "x-current-user-email": currentUserEmail },
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar el ticket.");
      }

      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
      }
    } catch (err: any) {
      alert(err?.message || "Error al eliminar el ticket.");
    } finally {
      setDeletingTicketId(null);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (targetSystemFilter !== "all" && t.target_system !== targetSystemFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchNum = t.ticket_number.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        if (!matchTitle && !matchNum && !matchDesc) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, categoryFilter, targetSystemFilter, searchTerm]);

  // Contadores
  const countTotal = tickets.length;
  const countPending = tickets.filter((t) => t.status === "pending_validation").length;
  const countInProgress = tickets.filter((t) => t.status === "in_director").length;
  const countCompleted = tickets.filter((t) => t.status === "completed").length;

  return (
    <PageTransition className="flex-1 flex flex-col overflow-hidden w-full">
      <div className="flex h-full flex-col overflow-y-auto w-full">
        <DashboardHeader
          title="Soporte Técnico"
          description="Gestión de peticiones técnicas, soporte y requerimientos para Plataforma Web y App Móvil."
          action={
            <button
              onClick={() => {
                setFormError(null);
                setFormFiles([]);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98]"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nueva Petición</span>
            </button>
          }
        />

        <div className="flex-1 space-y-5 p-4 sm:p-6 lg:p-8 w-full">
          {/* Tarjetas de Métricas Google Minimalist */}
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 w-full">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#161e27]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Tickets
                </span>
                <span className="material-symbols-outlined text-slate-400 text-[20px]">confirmation_number</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{countTotal}</p>
              <span className="text-xs text-slate-400">Registrados en el sistema</span>
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 shadow-xs dark:border-amber-900/30 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Pendientes
                </span>
                <span className="material-symbols-outlined text-amber-500 text-[20px]">schedule</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{countPending}</p>
              <span className="text-xs text-amber-600 dark:text-amber-400/80">Por revisión inicial</span>
            </div>

            <div className="rounded-2xl border border-blue-200/70 bg-blue-50/40 p-4 shadow-xs dark:border-blue-900/30 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  En Resolución
                </span>
                <span className="material-symbols-outlined text-blue-500 text-[20px]">engineering</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">{countInProgress}</p>
              <span className="text-xs text-blue-600 dark:text-blue-400/80">En proceso de atención</span>
            </div>

            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Resueltos
                </span>
                <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{countCompleted}</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400/80">Concluidos exitosamente</span>
            </div>
          </section>

          {/* Filtros y Búsqueda */}
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#161e27] lg:flex-row lg:items-center lg:justify-between w-full">
            <div className="relative flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, asunto o detalle..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Ámbito */}
              <select
                value={targetSystemFilter}
                onChange={(e) => setTargetSystemFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <option value="all">Todos los ámbitos</option>
                <option value="platform">💻 Plataforma Web</option>
                <option value="mobile">📱 App Móvil</option>
              </select>

              {/* Filtro Estado */}
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

              {/* Filtro Categoría */}
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>
          </section>

          {/* Listado de Tickets */}
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-[#161e27]">
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
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-[#161e27]">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">
                inbox
              </span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No hay peticiones de soporte registradas
              </p>
              <p className="max-w-md text-xs text-slate-400">
                Crea una nueva petición para reportar incidencias o mejoras técnicas tanto para la Plataforma Web como para la App Móvil.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 w-full">
              {filteredTickets.map((ticket) => {
                const statusInfo = STATUS_MAP[ticket.status] || {
                  label: ticket.status,
                  badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
                  icon: "info",
                };
                const prioInfo = PRIORITIES.find((p) => p.value === ticket.priority) || PRIORITIES[1];
                const catLabel = CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category;
                const targetSystemInfo = TARGET_SYSTEMS.find((s) => s.value === ticket.target_system) || TARGET_SYSTEMS[0];
                const { date, time } = formatDate(ticket.created_at);
                const hasAttachments = Boolean(ticket.attachments && ticket.attachments.length > 0);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="group flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-400 hover:shadow-xs dark:border-slate-800 dark:bg-[#161e27] dark:hover:border-blue-500/50 cursor-pointer sm:flex-row sm:items-center"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {ticket.ticket_number}
                        </span>

                        {/* Badge de Ámbito (Plataforma vs App Móvil) */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${targetSystemInfo.badgeClass}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{targetSystemInfo.icon}</span>
                          {targetSystemInfo.label}
                        </span>

                        {/* Badge Estado */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.badgeClass}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </span>

                        {/* Badge Prioridad */}
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${prioInfo.color}`}
                        >
                          {prioInfo.label}
                        </span>

                        {/* Categoría */}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {catLabel}
                        </span>

                        {/* Indicador de archivos adjuntos */}
                        {hasAttachments && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <span className="material-symbols-outlined text-[13px]">attach_file</span>
                            {ticket.attachments?.length}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {ticket.title}
                      </h3>

                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0 sm:flex-col sm:items-end sm:gap-1.5">
                      <div className="text-right text-xs text-slate-400">
                        <span>{date}</span>
                        {time && <span className="ml-1.5 font-mono text-[11px]">{time}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {ticket.reporter_name}
                        </span>

                        {/* Botón rápido de eliminar */}
                        <button
                          onClick={(e) => handleDeleteTicket(ticket.id, e)}
                          title="Eliminar ticket"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          type="button"
                          disabled={deletingTicketId === ticket.id}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {deletingTicketId === ticket.id ? "sync" : "delete"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Crear Ticket con soporte para Ámbito y Archivos Adjuntos */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#161e27]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <span className="material-symbols-outlined text-[20px]">add_task</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Nueva Petición de Soporte
                    </h2>
                    <p className="text-[11px] text-slate-400">Especifica el ámbito y adjunta evidencias</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
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

                {/* Selector de Ámbito: Plataforma Web vs App Móvil */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ¿Para qué entorno es este cambio / requerimiento? *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TARGET_SYSTEMS.map((sys) => {
                      const isSelected = formTargetSystem === sys.value;
                      return (
                        <button
                          key={sys.value}
                          type="button"
                          onClick={() => setFormTargetSystem(sys.value as "platform" | "mobile")}
                          className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/30"
                              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40"
                          }`}
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">{sys.icon}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                              {sys.label}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                              {sys.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Título del requerimiento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej: Corrección en registro de dosificadores / Ajuste en vista móvil..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-900/60 dark:text-white"
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
                    Descripción detallada del requerimiento *
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

                {/* Zona de Archivos Adjuntos */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Archivos adjuntos (capturas, PDFs o evidencias)
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center transition hover:border-blue-400 hover:bg-slate-50/50 dark:border-slate-700 dark:hover:border-blue-500/50 dark:hover:bg-slate-900/40"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[26px] text-slate-400">
                        cloud_upload
                      </span>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Haz clic o arrastra archivos aquí para adjuntar
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Imágenes (PNG, JPG), documentos (PDF, DOCX) o logs
                      </p>
                    </div>
                  </div>

                  {/* Lista de archivos seleccionados */}
                  {formFiles.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {formFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="material-symbols-outlined text-blue-600 text-[18px]">
                              {file.type.startsWith("image/") ? "image" : "description"}
                            </span>
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({formatFileSize(file.size)})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#161e27]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {selectedTicket.ticket_number}
                    </span>

                    {/* Badge Ámbito */}
                    {(() => {
                      const sys = TARGET_SYSTEMS.find((s) => s.value === selectedTicket.target_system) || TARGET_SYSTEMS[0];
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sys.badgeClass}`}>
                          <span className="material-symbols-outlined text-[13px]">{sys.icon}</span>
                          {sys.label}
                        </span>
                      );
                    })()}

                    {/* Badge Estado */}
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
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-900/50">
                  <div>
                    <span className="text-slate-400">Ámbito:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">
                        {TARGET_SYSTEMS.find((s) => s.value === selectedTicket.target_system)?.icon || "devices"}
                      </span>
                      {TARGET_SYSTEMS.find((s) => s.value === selectedTicket.target_system)?.label || "Plataforma Web"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Categoría:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {CATEGORIES.find((c) => c.value === selectedTicket.category)?.label || selectedTicket.category}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Prioridad:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {PRIORITIES.find((p) => p.value === selectedTicket.priority)?.label || selectedTicket.priority}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Fecha de registro:</span>
                    <p className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">
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

                {/* Archivos Adjuntos en Detalle */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">attach_file</span>
                      Archivos Adjuntos ({selectedTicket.attachments.length})
                    </h4>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTicket.attachments.map((att, index) => {
                        const isImage = att.content_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || att.url);
                        return (
                          <a
                            key={`${att.url}-${index}`}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 transition hover:border-blue-400 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-500/50"
                          >
                            <span className="material-symbols-outlined text-blue-600 text-[20px]">
                              {isImage ? "image" : "description"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-800 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">
                                {att.name || `Adjunto ${index + 1}`}
                              </p>
                              {att.size && (
                                <span className="text-[10px] text-slate-400">
                                  {formatFileSize(att.size)}
                                </span>
                              )}
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-[16px] group-hover:text-blue-600">
                              open_in_new
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

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

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  disabled={deletingTicketId === selectedTicket.id}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:text-red-400"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Eliminar Petición</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
