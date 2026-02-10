"use client";

type BrandLogoSize = "md" | "lg" | "xl" | "xxl";

type BrandLogoProps = {
  size?: BrandLogoSize;
};

const sizeStyles: Record<BrandLogoSize, { text: string }> = {
  md: {
    text: "text-xl",
  },
  lg: {
    text: "text-2xl",
  },
  xl: {
    text: "text-[2.44rem]",
  },
  xxl: {
    text: "text-[54px]",
  },
};

export default function BrandLogo({ size = "md" }: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className="flex items-center">
      <span className={`font-logo ${styles.text} font-bold text-primary lowercase`}>
        trust
      </span>
    </div>
  );
}
