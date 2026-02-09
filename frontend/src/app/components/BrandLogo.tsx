"use client";

type BrandLogoSize = "md" | "lg" | "xl" | "xxl";

type BrandLogoProps = {
  size?: BrandLogoSize;
};

const sizeStyles: Record<BrandLogoSize, { icon: string; text: string; gap: string }> = {
  md: {
    icon: "text-[20px]",
    text: "text-xl",
    gap: "gap-2",
  },
  lg: {
    icon: "text-[24px]",
    text: "text-2xl",
    gap: "gap-3",
  },
  xl: {
    icon: "text-[32px]",
    text: "text-3xl",
    gap: "gap-4",
  },
  xxl: {
    icon: "text-[60px]",
    text: "text-[54px]",
    gap: "gap-6",
  },
};

export default function BrandLogo({ size = "md" }: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${styles.gap}`}>
      <div className="bg-primary p-1 rounded flex items-center justify-center">
        <span
          className={`material-symbols-outlined text-slate-900 font-variation-fill ${styles.icon}`}
        >
          shield
        </span>
      </div>
      <span className={`font-logo ${styles.text} font-bold text-primary lowercase`}>
        trust
      </span>
    </div>
  );
}
