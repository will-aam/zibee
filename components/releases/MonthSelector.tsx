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
            "flex-1 sm:flex-none sm:w-48 justify-start text-left font-normal truncate",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date ? format(date, "MMMM yyyy", { locale: ptBR }) : "Mês"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setYearView((y) => y - 1)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-sm">{yearView}</div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
                  "h-9 text-xs capitalize",
                  isSelected ? "" : "hover:bg-accent",
                  !isSelected &&
                    isCurrentMonth &&
                    "border-primary text-primary",
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
