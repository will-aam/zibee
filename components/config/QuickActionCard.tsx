"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

export function QuickActionCard({
  icon: Icon,
  label,
  onClick,
  isActive = false,
}: QuickActionCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 gap-2 cursor-pointer transition-all hover:shadow-md hover:scale-105 active:scale-95",
        isActive && "border-primary bg-primary/10",
      )}
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="text-xs font-medium text-center">{label}</span>
    </Card>
  );
}
