"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader";
import PageTransition from "../components/PageTransition";

type CurrentUser = {
  id: number;
  full_name: string;
  email?: string;
  role: string;
  role_label: string;
  is_active: boolean;
  profile_photo?: string | null;
};

const SESSION_USER_KEY = "trust.currentUser";

const FALLBACK_USER: CurrentUser = {
  id: 0,
  full_name: "Admin Global",
  email: "admin@trust.com",
  role: "general_admin",
  role_label: "Administrador",
  is_active: true,
  profile_photo: null,
};

export default function AjustesPage() {
  const [user, setUser] = useState<CurrentUser>(FALLBACK_USER);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [formState, setFormState] = useState({ full_name: "", email: "", role: "", password: "", confirmPassword: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const sessionUserRaw = window.localStorage.getItem(SESSION_USER_KEY);
    let sessionUser: { email?: string } | null = null;

    if (sessionUserRaw) {
      try {
        sessionUser = JSON.parse(sessionUserRaw) as { email?: string };
      } catch {
        window.localStorage.removeItem(SESSION_USER_KEY);
      }
    }

    const loadCurrentUser = async () => {
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const users = (data.results ?? []) as CurrentUser[];
        const currentUser =
          (sessionUser?.email
            ? users.find((candidate) => candidate.email === sessionUser?.email)
            : null) ?? users.find((candidate) => candidate.is_active) ?? users[0] ?? FALLBACK_USER;

        if (!isMounted) return;
        setUser(currentUser);
        setFormState((prev) => ({ ...prev, full_name: currentUser.full_name, email: currentUser.email ?? "", role: currentUser.role }));
        setStatus("idle");
      } catch {
        if (!isMounted) return;
        setStatus("error");
      }
    };

    loadCurrentUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const isGeneralAdmin = user.role === "general_admin";

  const initials = useMemo(
    () => user.full_name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?",
    [user.full_name],
  );

  const photoSrc = photoPreview || user.profile_photo || null;

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    if (!user.id) return;
    if (formState.password && formState.password !== formState.confirmPassword) {
      setFeedback("La confirmación de contraseña no coincide.");
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.append("full_name", formState.full_name);
      body.append("email", formState.email);
      if (isGeneralAdmin) body.append("role", formState.role);
      if (formState.password) body.append("password", formState.password);
      if (photoFile) body.append("profile_photo", photoFile);

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "x-current-user-email": user.email ?? "" },
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar");
      const updated = payload as CurrentUser;
      setUser(updated);
      setFormState((prev) => ({ ...prev, password: "", confirmPassword: "", role: updated.role }));
      setPhotoFile(null);
      setPhotoPreview(null);
      setFeedback("Perfil actualizado correctamente.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DashboardHeader title="Ajustes de Usuario" description="Administra tu información de perfil y credenciales de acceso." />
      <PageTransition className="flex-1 overflow-y-auto p-4 md:p-8">
        <form className="mx-auto w-full max-w-4xl space-y-8" onSubmit={handleSubmit}>
          <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card dark:border-slate-800 dark:bg-[#161e27]">
            <div className="border-b border-slate-100 p-6 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Información del Perfil</h3>
            </div>
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center gap-4">
                <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200 dark:border-slate-800">
                  {photoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="Foto de perfil" className="h-full w-full object-cover" src={photoSrc} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-700">{initials}</div>
                  )}
                </div>
                <input accept="image/*" onChange={onPhotoChange} type="file" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                <label className="md:col-span-2 text-sm">Nombre completo
                  <input className="mt-1 w-full rounded-lg border px-3 py-2" name="full_name" onChange={(e)=>setFormState((p)=>({...p, full_name:e.target.value}))} value={formState.full_name} />
                </label>
                <label className="text-sm">Correo electrónico
                  <input className="mt-1 w-full rounded-lg border px-3 py-2" name="email" onChange={(e)=>setFormState((p)=>({...p, email:e.target.value}))} value={formState.email} />
                </label>
                <label className="text-sm">Rol
                  {isGeneralAdmin ? (
                    <select className="mt-1 w-full rounded-lg border px-3 py-2" value={formState.role} onChange={(e)=>setFormState((p)=>({...p, role:e.target.value}))}>
                      <option value="general_admin">Admin Global</option>
                      <option value="account_admin">Admin de Cuentas</option>
                      <option value="branch_admin">Admin de Sucursal</option>
                      <option value="inspector">Inspector</option>
                    </select>
                  ) : (
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 bg-slate-100" readOnly value={user.role_label} />
                  )}
                </label>
                <label className="text-sm">Nueva contraseña
                  <input className="mt-1 w-full rounded-lg border px-3 py-2" onChange={(e)=>setFormState((p)=>({...p, password:e.target.value}))} type="password" value={formState.password} />
                </label>
                <label className="text-sm">Confirmar contraseña
                  <input className="mt-1 w-full rounded-lg border px-3 py-2" onChange={(e)=>setFormState((p)=>({...p, confirmPassword:e.target.value}))} type="password" value={formState.confirmPassword} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
              <button className="rounded-lg bg-professional-green px-5 py-2.5 text-sm font-medium text-white" disabled={saving || status === "loading"} type="submit">{saving ? "Guardando..." : "Guardar Cambios"}</button>
            </div>
          </section>
          {feedback && <p className="text-sm text-slate-600 dark:text-slate-300">{feedback}</p>}
        </form>
      </PageTransition>
    </>
  );
}
