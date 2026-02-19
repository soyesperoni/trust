"use client";

import Image from "next/image";

import supplyLogo from "../supply.png";

type BrandLogoSize = "md" | "lg" | "xl" | "xxl";

type BrandLogoProps = {
  size?: BrandLogoSize;
  showSupplyLogo?: boolean;
  showBySupply?: boolean;
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

export default function BrandLogo({
  size = "md",
  showSupplyLogo = false,
  showBySupply = false,
}: BrandLogoProps) {
  const styles = sizeStyles[size];
  const shouldShowSupplyLogo = showSupplyLogo || showBySupply;

  return (
    <div className="flex items-center gap-2">
      <span className={`font-logo ${styles.text} font-bold text-primary lowercase`}>
        trust
      </span>
      {showBySupply ? <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">by</span> : null}
      {shouldShowSupplyLogo ? (
        <Image
          src={supplyLogo}
          alt="SupplyMax"
          className="h-7 w-auto"
          priority
        />
      ) : null}
    </div>
  );
}
