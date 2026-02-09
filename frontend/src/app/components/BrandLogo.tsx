"use client";

type BrandLogoSize = "sm" | "md" | "lg" | "xl";

type BrandLogoProps = {
  size?: BrandLogoSize;
};

const sizeStyles: Record<
  BrandLogoSize,
  { container: string; icon: string; text: string }
> = {
  sm: {
    container: "p-1 rounded",
    icon: "text-[20px]",
    text: "text-xl",
  },
  md: {
    container: "p-1.5 rounded-md",
    icon: "text-[24px]",
    text: "text-2xl",
  },
  lg: {
    container: "p-1.5 rounded-md",
    icon: "text-[24px]",
    text: "text-3xl",
  },
  xl: {
    container: "p-2 rounded-lg shadow-sm",
    icon: "text-[32px]",
    text: "text-5xl",
  },
};

export default function BrandLogo({ size = "md" }: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className="flex items-center gap-3">
      <div className={`bg-primary ${styles.container} flex items-center justify-center`}>
        <span
          className={`material-symbols-outlined text-slate-900 font-variation-fill ${styles.icon}`}
        >
          shield
        </span>
      </div>
      <span
        className={`font-logo font-bold text-primary tracking-tight leading-none lowercase ${styles.text}`}
      >
        trust
      </span>
    </div>
  );
}
