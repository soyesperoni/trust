"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardHeader from "../../../../components/DashboardHeader";
import PageTransition from "../../../../components/PageTransition";
import { getSessionUserEmail } from "../../../../lib/session";

type QuestionDraft = {
  id: string;
  label: string;
  response_type: "yes_no" | "number" | "text";
  required: boolean;
  requires_image_evidence: boolean;
};

const createQuestion = (): QuestionDraft => ({
  id: crypto.randomUUID(),
  label: "",
  response_type: "yes_no",
  required: true,
  requires_image_evidence: false,
});

export default function NuevaPlantillaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([createQuestion()]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const addQuestion = () => setQuestions((prev) => [...prev, createQuestion()]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const hasInvalidQuestion = questions.some((question) => !question.label.trim());
    if (hasInvalidQuestion) {
      setError("Todas las preguntas deben tener un enunciado.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/audits/forms/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-user-email": getSessionUserEmail(),
        },
        body: JSON.stringify({
          name,
          is_active: isActive,
          schema: {
            category,
            questions: questions.map((question) => ({
              label: question.label.trim(),
              response_type: question.response_type,
              required: question.required,
              requires_image_evidence: question.requires_image_evidence,
              options: question.response_type === "yes_no" ? ["Sí", "No"] : undefined,
            })),
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "No se pudo crear la plantilla.");
      }

      router.push("/clientes/auditorias/plantillas");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la plantilla.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Nueva plantilla" description="Define preguntas y tipo de respuesta para auditorías." />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <form className="max-w-4xl mx-auto bg-white dark:bg-[#161e27] rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-6" onSubmit={handleSubmit}>
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Nombre
              <input required value={name} onChange={(event) => setName(event.target.value)} className="px-3 py-2.5 rounded-lg border" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Categoría
              <input value={category} onChange={(event) => setCategory(event.target.value)} className="px-3 py-2.5 rounded-lg border" />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Plantilla activa
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Preguntas</h3>
              <button type="button" className="text-sm font-semibold text-primary" onClick={addQuestion}>+ Agregar pregunta</button>
            </div>

            {questions.map((question, index) => (
              <div key={question.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pregunta {index + 1}</p>
                  <button type="button" onClick={() => removeQuestion(question.id)} className="text-xs text-red-600">Eliminar</button>
                </div>

                <input
                  value={question.label}
                  onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                  placeholder="Enunciado"
                  className="w-full px-3 py-2.5 rounded-lg border"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm flex flex-col gap-1">
                    Tipo de respuesta
                    <select
                      value={question.response_type}
                      onChange={(event) => updateQuestion(question.id, { response_type: event.target.value as QuestionDraft["response_type"] })}
                      className="px-3 py-2.5 rounded-lg border"
                    >
                      <option value="yes_no">Sí / No</option>
                      <option value="number">Número</option>
                      <option value="text">Texto</option>
                    </select>
                  </label>
                  <label className="text-sm inline-flex items-center gap-2 mt-6">
                    <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} />
                    Obligatoria
                  </label>
                  <label className="text-sm inline-flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      checked={question.requires_image_evidence}
                      onChange={(event) => updateQuestion(question.id, { requires_image_evidence: event.target.checked })}
                    />
                    Requiere evidencia de imagen
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/clientes/auditorias/plantillas" className="px-4 py-2 rounded-lg border">Cancelar</Link>
            <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-lg bg-slate-900 text-white">
              {isSaving ? "Guardando..." : "Guardar plantilla"}
            </button>
          </div>
        </form>
      </PageTransition>
    </>
  );
}
