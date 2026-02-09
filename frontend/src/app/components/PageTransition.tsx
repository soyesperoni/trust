"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export default function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={`page-transition ${className}`.trim()}>
      {children}
    </div>
  );
}
