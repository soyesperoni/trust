"use client";

export default function BrandLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary p-1 rounded flex items-center justify-center">
        <span className="material-symbols-outlined text-slate-900 text-[20px] font-variation-fill">
          shield
        </span>
      </div>
      <span className="font-logo text-xl font-bold text-primary lowercase">
        trust
      </span>
    </div>
  );
}
