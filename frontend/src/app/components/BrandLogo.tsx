"use client";

import Image from "next/image";

type BrandLogoSize = "md" | "lg" | "xl" | "xxl";

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
};

const sizeStyles: Record<BrandLogoSize, { logo: string }> = {
  md: {
    logo: "h-8",
  },
  lg: {
    logo: "h-10",
  },
  xl: {
    logo: "h-11",
  },
  xxl: {
    logo: "h-16",
  },
};

export default function BrandLogo({
  size = "md",
  className = "",
}: BrandLogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className={`flex items-center ${className}`.trim()}>
      <Image
        src="/trust_logo.svg"
        alt="Trust"
        className={`${styles.logo} w-auto dark:hidden`}
        width={512}
        height={128}
        priority
      />
      <Image
        src="/trust_logo_white.svg"
        alt="Trust"
        className={`${styles.logo} hidden w-auto dark:block`}
        width={512}
        height={128}
        priority
      />
    </div>
  );
}
