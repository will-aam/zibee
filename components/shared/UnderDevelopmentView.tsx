"use client";

import React from "react";
import { WrenchIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface UnderDevelopmentViewProps {
  title?: string;
  description?: string;
  minHeightClassName?: string;
}

export default function UnderDevelopmentView({
  title = "Em Desenvolvimento",
  description = "Esta área está sendo construída e estará disponível em breve.",
  minHeightClassName = "min-h-[60vh]",
}: UnderDevelopmentViewProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        minHeightClassName
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <WrenchIcon className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
    </div>
  );
}
