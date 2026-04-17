"use client";

import type { Variants } from "motion/react";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CheckCircleIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  checked: boolean;
}

const CHECK_VARIANTS: Variants = {
  unchecked: { pathLength: 0, opacity: 0 },
  checked: {
    pathLength: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.4 },
  },
};

export function CheckCircleIcon({
  checked,
  className,
  size = 28,
  ...props
}: CheckCircleIconProps) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <svg
        fill="none"
        height={size}
        width={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Círculo de fora (Sempre visível) */}
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        {/* O "V" de check (Animado!) */}
        <motion.path
          d="M9 12.75 11.25 15 15 9.75"
          variants={CHECK_VARIANTS}
          initial={false} // O "false" aqui impede de animar se você só abrir a tela e já estiver pago
          animate={checked ? "checked" : "unchecked"}
        />
      </svg>
    </div>
  );
}
