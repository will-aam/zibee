// components/shared/MonthSelector.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MonthSelectorProps {
  date: Date | undefined;
  setDate: (date: Date) => void;
}

export function MonthSelector({ date, setDate }: MonthSelectorProps) {
  const [yearView, setYearView] = useState(new Date().getFullYear());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (date) {
      setYearView(date.getFullYear());
    }
  }, [date, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "flex-1 sm:flex-none sm:w-48 justify-start text-left font-semibold truncate rounded-xl h-10 border-border/50 hover:bg-muted/50",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2.5 h-4 w-4 shrink-0 text-primary" />
          <span className="truncate capitalize">
            {date ? format(date, "MMMM yyyy", { locale: ptBR }) : "Mês"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 rounded-3xl border-border/40"
        align="end"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={() => setYearView((y) => y - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <div className="font-bold text-sm tracking-tight">{yearView}</div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={() => setYearView((y) => y + 1)}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, index) => {
            const monthDate = new Date(yearView, index, 1);
            const isSelected =
              date?.getMonth() === index && date?.getFullYear() === yearView;
            const isCurrentMonth =
              new Date().getMonth() === index &&
              new Date().getFullYear() === yearView;

            return (
              <Button
                key={index}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "h-10 text-xs capitalize rounded-xl transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary/5 hover:border-primary/30 border-border/40",
                  !isSelected &&
                    isCurrentMonth &&
                    "border-primary/60 text-primary font-bold bg-primary/5",
                )}
                onClick={() => {
                  setDate(monthDate);
                  setIsOpen(false);
                }}
              >
                {format(monthDate, "MMM", { locale: ptBR })}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
