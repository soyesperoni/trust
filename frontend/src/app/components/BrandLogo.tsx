"use client";

import Image from "next/image";

type BrandLogoSize = "md" | "lg" | "xl" | "xxl";

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
  compact?: boolean;
};

const sizeStyles: Record<BrandLogoSize, { logo: string; icon: string }> = {
  md: { logo: "h-8", icon: "h-8 w-8" },
  lg: { logo: "h-10", icon: "h-10 w-10" },
  xl: { logo: "h-11", icon: "h-11 w-11" },
  xxl: { logo: "h-16", icon: "h-16 w-16" },
};

export default function BrandLogo({
  size = "md",
  className = "",
  compact = false,
}: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${className}`.trim()}>
      <Image
        src={compact ? "/icono_app.png" : "/trust_logo_s.svg"}
        alt="Trust"
        className={
          compact
            ? `${styles.icon} object-contain`
            : `${styles.logo} w-auto scale-[1.05] origin-left`
        }
        width={compact ? 80 : 512}
        height={compact ? 80 : 128}
        priority
      />
    </div>
  );
}
