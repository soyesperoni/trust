"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../../../components/DashboardHeader";
import PageTransition from "../../../../../components/PageTransition";
import { getSessionUserEmail } from "../../../../../lib/session";

type QuestionDraft = {
  id: string;
  label: string;
  response_type: "yes_no" | "number" | "text";
  required: boolean;
  requires_image_evidence: boolean;
  question_weight: number;
  response_scores: {
    yes: number;
    no: number;
    not_applicable: number;
  };
};

type TemplateResponse = {
  id: number;
  name: string;
  is_active: boolean;
  schema?: {
    category?: string;
    questions?: Array<{
      label?: string;
      response_type?: "yes_no" | "number" | "text";
      required?: boolean;
      requires_image_evidence?: boolean;
      question_weight?: number;
      response_scores?: { yes?: number; no?: number; not_applicable?: number };
    }>;
  };
};

type TemplateSchema = NonNullable<TemplateResponse["schema"]>;

const createQuestion = (weight: number): QuestionDraft => ({
  id: crypto.randomUUID(),
  label: "",
  response_type: "yes_no",
  required: true,
  requires_image_evidence: false,
  question_weight: weight,
  response_scores: { yes: 100, no: 0, not_applicable: 0 },
});

const parseQuestions = (questions: TemplateSchema["questions"]): QuestionDraft[] => {
  if (!questions?.length) return [createQuestion(100)];
  const defaultWeight = Number((100 / questions.length).toFixed(2));
  return questions.map((question) => ({
    id: crypto.randomUUID(),
    label: String(question.label ?? ""),
    response_type:
      question.response_type === "number" || question.response_type === "text" || question.response_type === "yes_no"
        ? question.response_type
        : "yes_no",
    required: question.required ?? true,
    requires_image_evidence: question.requires_image_evidence ?? false,
    question_weight: question.question_weight ?? defaultWeight,
    response_scores: {
      yes: question.response_scores?.yes ?? 100,
      no: question.response_scores?.no ?? 0,
      not_applicable: question.response_scores?.not_applicable ?? 0,
    },
  }));
};


const distributeWeight = (count: number) => {
  if (count <= 0) return 0;
  return Number((100 / count).toFixed(2));
};

export default function EditarPlantillaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  const [templateId, setTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestion(100)]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        const resolved = await params;
        if (!isMounted) return;
        setTemplateId(resolved.id);

        const response = await fetch(`/api/audits/forms/${resolved.id}/`, {
          headers: { "x-current-user-email": getSessionUserEmail() },
          cache: "no-store",
        });
        const payload = (await response.json()) as TemplateResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "No se pudo cargar la plantilla.");

        if (!isMounted) return;
        setName(payload.name ?? "");
        setCategory(String(payload.schema?.category ?? "General"));
        setIsActive(Boolean(payload.is_active));
        setQuestions(parseQuestions(payload.schema?.questions));
        setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la plantilla.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [params]);

  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((item) => item.id !== id);
      const weight = distributeWeight(next.length);
      return next.map((item) => ({ ...item, question_weight: weight }));
    });
  };

  const addQuestion = () =>
    setQuestions((prev) => {
      const next = [...prev, createQuestion(0)];
      const weight = distributeWeight(next.length);
      return next.map((item) => ({ ...item, question_weight: weight }));
    });

  const completionStats = useMemo(() => {
    const total = questions.length;
    const completed = questions.filter((question) => question.label.trim().length > 0).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [questions]);

  const totalWeight = useMemo(() => questions.reduce((sum, question) => sum + question.question_weight, 0), [questions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre de la plantilla es obligatorio.");
      return;
    }

    const hasInvalidQuestion = questions.some((question) => !question.label.trim());
    if (totalWeight > 100) {
      setError("La suma de porcentajes ponderados no puede superar 100%.");
      return;
    }
    if (hasInvalidQuestion) {
      setError("Todas las preguntas deben tener un enunciado.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/audits/forms/${templateId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          name: name.trim(),
          is_active: isActive,
          schema: {
            category: category.trim() || "General",
            questions: questions.map((question) => ({
              label: question.label.trim(),
              response_type: question.response_type,
              required: question.required,
              requires_image_evidence: question.requires_image_evidence,
              question_weight: question.question_weight,
              options: question.response_type === "yes_no" ? ["Sí", "No", "No aplica"] : undefined,
              response_scores: question.response_type === "yes_no" ? question.response_scores : undefined,
              min: question.response_type === "number" ? 1 : undefined,
              max: question.response_type === "number" ? 10 : undefined,
            })),
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo actualizar la plantilla.");
      }

      router.push("/clientes/auditorias/plantillas");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo actualizar la plantilla.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Editar plantilla"
        description="Actualiza la plantilla con el mismo editor de creación para modificar preguntas y configuración."
      />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        {isLoading ? (
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-card dark:border-slate-800 dark:bg-[#161e27] dark:text-slate-300">
            Cargando plantilla...
          </div>
        ) : (
          <form className="mx-auto max-w-5xl space-y-6" onSubmit={handleSubmit}>
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
              <div className="bg-gradient-to-r from-primary/15 via-blue-500/10 to-violet-500/10 p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-3 py-1 text-xs font-semibold text-primary dark:bg-slate-900/40">
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      Configurador de plantilla
                    </p>
                    <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">Edita una plantilla moderna y reutilizable</h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                      Ajusta preguntas con respuestas tipo <strong>Sí/No/No aplica</strong>, escala numérica de <strong>1 a 10</strong> o texto libre.
                    </p>
                  </div>

                  <div className="w-full rounded-xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur md:w-72 dark:border-slate-700/60 dark:bg-slate-900/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Progreso de captura</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{completionStats.percentage}%</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {completionStats.completed} de {completionStats.total} preguntas con enunciado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-6 md:p-8">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nombre de la plantilla
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Ej: Checklist de seguridad"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Categoría
                  <input
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                    placeholder="Ej: Seguridad industrial"
                  />
                </label>

                <label className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="accent-primary" />
                  Plantilla activa
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-[#161e27] md:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preguntas del formulario</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Define pesos por pregunta y puntajes para Sí/No/No aplica.</p>
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Peso total asignado: {totalWeight.toFixed(2)}%</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                  onClick={addQuestion}
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Agregar pregunta
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => (
                  <article
                    key={question.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm transition-colors hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900/30"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pregunta {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Eliminar
                      </button>
                    </div>

                    <input
                      value={question.label}
                      onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                      placeholder="Escribe el enunciado de la pregunta"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                    />

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Tipo de respuesta
                        <select
                          value={question.response_type}
                          onChange={(event) => updateQuestion(question.id, { response_type: event.target.value as QuestionDraft["response_type"] })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="yes_no">Sí / No / No aplica</option>
                          <option value="number">Valor del 1 al 10</option>
                          <option value="text">Texto libre</option>
                        </select>
                      </label>

                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Peso de la pregunta (%)
                      <input type="number" min={0} max={100} step={0.01} value={question.question_weight} onChange={(event) => updateQuestion(question.id, { question_weight: Number(event.target.value) })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800" />
                    </label>

                    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                          className="accent-primary"
                        />
                        Obligatoria
                      </label>

                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={question.requires_image_evidence}
                          onChange={(event) => updateQuestion(question.id, { requires_image_evidence: event.target.checked })}
                          className="accent-primary"
                        />
                        Evidencia de imagen
                      </label>
                    </div>

                    {question.response_type === "yes_no" ? (
                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sí (%)
                          <input type="number" min={0} max={100} step={0.01} value={question.response_scores.yes} onChange={(event) => updateQuestion(question.id, { response_scores: { ...question.response_scores, yes: Number(event.target.value) } })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
                        </label>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">No (%)
                          <input type="number" min={0} max={100} step={0.01} value={question.response_scores.no} onChange={(event) => updateQuestion(question.id, { response_scores: { ...question.response_scores, no: Number(event.target.value) } })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
                        </label>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">No aplica (%)
                          <input type="number" min={0} max={100} step={0.01} value={question.response_scores.not_applicable} onChange={(event) => updateQuestion(question.id, { response_scores: { ...question.response_scores, not_applicable: Number(event.target.value) } })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
                        </label>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <div className="flex justify-end gap-3 pb-2">
              <Link
                href="/clientes/auditorias/plantillas"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-[#161e27] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </PageTransition>
    </>
  );
}
