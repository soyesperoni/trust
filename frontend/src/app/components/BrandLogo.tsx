"use client";

import Image from "next/image";

import supplyLogo from "../supply.png";

type BrandLogoSize = "md" | "lg" | "xl" | "xxl";

type BrandLogoProps = {
  size?: BrandLogoSize;
  showSupplyLogo?: boolean;
  showBySupply?: boolean;
  className?: string;
};

const sizeStyles: Record<BrandLogoSize, { text: string; supply: string }> = {
  md: {
    text: "text-xl",
    supply: "h-5",
  },
  lg: {
    text: "text-2xl",
    supply: "h-6",
  },
  xl: {
    text: "text-[2.44rem]",
    supply: "h-9",
  },
  xxl: {
    text: "text-[54px]",
    supply: "h-12",
  },
};

export default function BrandLogo({
  size = "md",
  showSupplyLogo = false,
  showBySupply = false,
  className = "",
}: BrandLogoProps) {
  const styles = sizeStyles[size];
  const shouldShowSupplyLogo = showSupplyLogo || showBySupply;

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <span className={`font-logo ${styles.text} font-bold text-primary lowercase`}>
        trust
      </span>
      {showBySupply ? <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">by</span> : null}
      {shouldShowSupplyLogo ? (
        <Image
          src={supplyLogo}
          alt="SupplyMax"
          className={`${styles.supply} w-auto`}
          priority
        />
      ) : null}
    </div>
  );
}
