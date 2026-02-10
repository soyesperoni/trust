import Link from "next/link";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type CalendarVisit = {
  day: string;
  events: { time: string; label: string; type: "mantenimiento" | "emergencia" }[];
  muted?: boolean;
  isToday?: boolean;
};

const weekHeaders = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const days: CalendarVisit[] = [
  { day: "", events: [], muted: true },
  { day: "", events: [], muted: true },
  { day: "", events: [], muted: true },
  { day: "1", events: [] },
  {
    day: "2",
    events: [{ time: "09:00", label: "Plaza Vea", type: "mantenimiento" }],
  },
  { day: "3", events: [] },
  { day: "4", events: [] },
  {
    day: "5",
    events: [{ time: "08:30", label: "! Fuga de agua", type: "emergencia" }],
  },
  { day: "6", events: [] },
  { day: "7", events: [] },
  {
    day: "8",
    events: [
      { time: "10:00", label: "Metro Sur", type: "mantenimiento" },
      { time: "14:00", label: "Tottus Centro", type: "mantenimiento" },
    ],
  },
  { day: "9", events: [] },
  { day: "10", events: [] },
  { day: "11", events: [] },
  {
    day: "12",
    isToday: true,
    events: [
      {
        time: "11:30",
        label: "Primax Javier Prado",
        type: "mantenimiento",
      },
      { time: "16:45", label: "! Falla eléctrica", type: "emergencia" },
    ],
  },
  { day: "13", events: [] },
  { day: "14", events: [] },
  {
    day: "15",
    events: [{ time: "09:00", label: "Vivanda", type: "mantenimiento" }],
  },
  { day: "16", events: [] },
  { day: "17", events: [] },
  { day: "18", events: [] },
  {
    day: "19",
    events: [{ time: "10:00", label: "Wong Óvalo", type: "mantenimiento" }],
  },
  { day: "20", events: [] },
  { day: "21", events: [] },
  { day: "22", events: [] },
  {
    day: "23",
    events: [{ time: "06:00", label: "! Filtración", type: "emergencia" }],
  },
  { day: "24", events: [] },
  { day: "25", events: [] },
  { day: "26", events: [] },
  {
    day: "27",
    events: [{ time: "15:00", label: "Makro", type: "mantenimiento" }],
  },
  { day: "28", events: [] },
  { day: "29", events: [] },
  {
    day: "30",
    events: [{ time: "08:00", label: "Plaza Vea Sur", type: "mantenimiento" }],
  },
  { day: "", events: [], muted: true },
  { day: "", events: [], muted: true },
];

const eventStyles = {
  mantenimiento:
    "bg-professional-green/10 border-l-2 border-professional-green text-professional-green hover:bg-professional-green/20",
  emergencia:
    "bg-primary/20 border-l-2 border-primary text-slate-900 hover:bg-primary/30",
};

export default function CalendarioPage() {
  return (
    <>
      <DashboardHeader
        title="Calendario de Visitas"
        action={
          <Link
            href="/clientes/calendario/nueva"
            className="bg-professional-green hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Agendar Visita
          </Link>
        }
      />

      <PageTransition className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                Noviembre 2023
              </h3>
              <div className="flex bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-1">
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500" type="button">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500" type="button">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                type="button"
              >
                Mes
              </button>
              <button
                className="px-3 py-1.5 text-sm font-medium bg-transparent border border-transparent rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                type="button"
              >
                Semana
              </button>
              <button
                className="px-3 py-1.5 text-sm font-medium bg-transparent border border-transparent rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                type="button"
              >
                Día
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
              {weekHeaders.map((header) => (
                <div
                  key={header}
                  className="text-xs font-semibold text-slate-400 uppercase text-center py-2 border-b border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                >
                  {header}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-50 dark:bg-slate-900">
              {days.map((day, index) => (
                <div
                  key={`${day.day}-${index}`}
                  className={`min-h-[100px] border p-2 relative transition-colors ${
                    day.muted
                      ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                      : "bg-white dark:bg-[#161e27] border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                  } ${day.isToday ? "ring-2 ring-inset ring-primary/50" : ""}`}
                >
                  {day.day &&
                    (day.isToday ? (
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-black text-sm font-bold ml-0.5 mt-0.5">
                        {day.day}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                        {day.day}
                      </span>
                    ))}

                  {day.events.map((event) => (
                    <div
                      key={`${day.day}-${event.time}-${event.label}`}
                      className={`mt-1 p-1 rounded text-[10px] font-medium truncate cursor-pointer ${eventStyles[event.type]}`}
                    >
                      {event.time} - {event.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="w-80 bg-white dark:bg-[#161e27] border-l border-slate-200 dark:border-slate-800 flex-col shrink-0 hidden xl:flex">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Resumen del Día
            </h3>
            <p className="text-sm text-slate-500 mt-1">12 Noviembre, 2023</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-professional-green dark:bg-green-900/30 dark:text-green-300">
                  Mantenimiento
                </span>
                <span className="text-xs font-semibold text-slate-400">11:30 AM</span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                Primax Javier Prado
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">Av. Javier Prado Este 4500</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  CR
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Carlos Ruiz</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border-l-4 border-l-primary bg-yellow-50/30 dark:bg-yellow-900/10 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-black">
                  Emergencia
                </span>
                <span className="text-xs font-semibold text-slate-400">04:45 PM</span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Sucursal Centro #04</h4>
              <p className="text-xs text-slate-500 mt-1 mb-3">! Falla eléctrica en tablero principal</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  AG
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400">Ana Gómez</span>
              </div>
              <button
                className="w-full mt-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                type="button"
              >
                Ver Detalles
              </button>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#161e27]">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Estadísticas del mes
            </span>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-2xl font-bold text-professional-green">24</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium">Completadas</div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-2xl font-bold text-slate-800 dark:text-white">8</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium">Pendientes</div>
              </div>
            </div>
          </div>
        </aside>
      </PageTransition>
    </>
  );
}
