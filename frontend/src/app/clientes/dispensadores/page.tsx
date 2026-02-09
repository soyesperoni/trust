"use client";

import Link from "next/link";

import DashboardHeader from "../../components/DashboardHeader";
import PageTransition from "../../components/PageTransition";

type DispenserStatus = "Operativo" | "Mantenimiento" | "Inactivo";

type DispenserRow = {
  id: number;
  code: string;
  serial: string;
  model: string;
  area: string;
  branch: string;
  branchInitials: string;
  products: number;
  status: DispenserStatus;
};

const DISPENSERS: DispenserRow[] = [
  {
    id: 1,
    code: "DS-2023-001",
    serial: "#8492",
    model: "Ecolab 4-Station",
    area: "Cocina Principal",
    branch: "Metro Norte #45",
    branchInitials: "SM",
    products: 4,
    status: "Operativo",
  },
  {
    id: 2,
    code: "DS-2023-042",
    serial: "#8510",
    model: "Seko ProMax",
    area: "Lavandería",
    branch: "Hotel Fiesta",
    branchInitials: "HF",
    products: 2,
    status: "Mantenimiento",
  },
  {
    id: 3,
    code: "DS-2023-088",
    serial: "#9001",
    model: "Diversey Quattro",
    area: "Baños Piso 2",
    branch: "CC Plaza",
    branchInitials: "CC",
    products: 3,
    status: "Inactivo",
  },
  {
    id: 4,
    code: "DS-2023-104",
    serial: "#9120",
    model: "Ecolab 4-Station",
    area: "Área de Servicio",
    branch: "Primax Central",
    branchInitials: "GP",
    products: 1,
    status: "Operativo",
  },
  {
    id: 5,
    code: "DS-2023-112",
    serial: "#9334",
    model: "Seko ProMax",
    area: "Barra Principal",
    branch: "Hotel Fiesta",
    branchInitials: "HF",
    products: 4,
    status: "Operativo",
  },
];

const statusStyles: Record<DispenserStatus, { badge: string; dot: string }> = {
  Operativo: {
    badge:
      "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    dot: "bg-green-500",
  },
  Mantenimiento: {
    badge:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    dot: "bg-yellow-500",
  },
  Inactivo: {
    badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export default function DispensadoresPage() {
  return (
    <>
      <DashboardHeader
        title="Gestión de Dosificadores"
        searchPlaceholder="Buscar dosificador..."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-white dark:bg-[#161e27] rounded-xl shadow-card border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Dosificadores
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Listado completo de equipos instalados.
              </p>
            </div>
            <Link
              className="bg-professional-green text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              href="/clientes/dispensadores/nuevo"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo Dosificador
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Dosificador</th>
                  <th className="px-6 py-4">Modelo</th>
                  <th className="px-6 py-4">Área</th>
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4 text-center">Productos</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {DISPENSERS.map((dispenser) => {
                  const statusStyle = statusStyles[dispenser.status];

                  return (
                    <tr
                      key={dispenser.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <span className="material-symbols-outlined">
                              water_drop
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {dispenser.code}
                            </div>
                            <div className="text-xs text-slate-500">
                              ID: {dispenser.serial}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {dispenser.model}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {dispenser.area}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {dispenser.branchInitials}
                          </div>
                          <span className="text-slate-600 dark:text-slate-300">
                            {dispenser.branch}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {dispenser.products}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}
                          ></span>
                          {dispenser.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-professional-green transition-colors">
                          <span className="material-symbols-outlined">
                            more_vert
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#161e27]">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-medium">1-5</span> de{" "}
              <span className="font-medium">842</span> resultados
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                disabled
              >
                Anterior
              </button>
              <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-600 hover:bg-slate-50">
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
}
