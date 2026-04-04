// app/components/lancamentos/LancamentosFilters.tsx
"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query"; // Importe o hook que criamos

// --- TIPAGENS ---
interface LancamentosFiltersProps {
  filtrosTipo: string[];
  setFiltrosTipo: React.Dispatch<React.SetStateAction<string[]>>;
  filtrosCategoria: string[];
  setFiltrosCategoria: React.Dispatch<React.SetStateAction<string[]>>;
  filtrosPagamento: string[];
  setFiltrosPagamento: React.Dispatch<React.SetStateAction<string[]>>;
  filtroStatus: string | null;
  setFiltroStatus: React.Dispatch<React.SetStateAction<string | null>>;
  categoriasOptions: { id: number; nome: string }[];
  pagamentoOptions: { id: number; nome: string }[];
}

// --- BOTÃO DO FILTRO (PÍLULA) ---
const FilterPill = ({ label, isActive, count, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap select-none",
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background hover:bg-accent text-muted-foreground",
    )}
  >
    {label}
    {typeof count === "number" && count > 0 && (
      <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-background/20 text-[10px]">
        {count}
      </span>
    )}
    <ChevronDown className="h-3 w-3 opacity-50" />
  </button>
);

// --- CONTEÚDO DO FILTRO (LISTA DE OPÇÕES) ---
// Extraímos isso para não repetir código dentro do Popover e da Sheet
const FilterContent = ({
  options,
  selectedValues,
  onToggle,
  onClear,
}: {
  options: string[];
  selectedValues: string[];
  onToggle: (val: string) => void;
  onClear: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Badge
            key={option}
            variant={selectedValues.includes(option) ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary/80 hover:text-primary-foreground transition-colors"
            onClick={() => onToggle(option)}
          >
            {option}
          </Badge>
        ))}
      </div>
      {selectedValues.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="self-start h-8 px-2 text-muted-foreground hover:text-destructive"
        >
          Limpar seleção
        </Button>
      )}
    </div>
  );
};

// --- COMPONENTE RESPONSIVO (Sheet no Mobile / Popover no Desktop) ---
const ResponsiveFilter = ({
  title,
  label,
  options,
  selectedValues,
  setSelectedValues,
}: {
  title: string;
  label: string;
  options: string[]; // Lista de strings simples para exibir
  selectedValues: string[];
  setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>;
}) => {
  const isDesktop = useMediaQuery("(min-width: 768px)"); // Detecta Desktop
  const [open, setOpen] = React.useState(false);

  const toggleSelection = (item: string) => {
    setSelectedValues((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const clearSelection = () => setSelectedValues([]);

  // RENDERIZAÇÃO DESKTOP (POPOVER)
  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div>
            <FilterPill
              label={label}
              isActive={selectedValues.length > 0}
              count={selectedValues.length}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-4" align="start">
          <div className="space-y-2">
            <h4 className="font-medium leading-none mb-3 text-muted-foreground text-xs uppercase tracking-wider">
              {title}
            </h4>
            <FilterContent
              options={options}
              selectedValues={selectedValues}
              onToggle={toggleSelection}
              onClear={clearSelection}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // RENDERIZAÇÃO MOBILE (SHEET)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div>
          <FilterPill
            label={label}
            isActive={selectedValues.length > 0}
            count={selectedValues.length}
          />
        </div>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-xl h-auto max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <FilterContent
          options={options}
          selectedValues={selectedValues}
          onToggle={toggleSelection}
          onClear={clearSelection}
        />
        <SheetFooter className="mt-6">
          <SheetClose asChild>
            <Button className="w-full">Concluir</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

// --- COMPONENTE PRINCIPAL ---
export function LancamentosFilters({
  filtrosTipo,
  setFiltrosTipo,
  filtrosCategoria,
  setFiltrosCategoria,
  filtrosPagamento,
  setFiltrosPagamento,
  filtroStatus,
  setFiltroStatus,
  categoriasOptions,
  pagamentoOptions,
}: LancamentosFiltersProps) {
  // Wrapper simples para o filtro de status (já que ele é string | null e não array)
  // Vamos tratar "pago" e "pendente" como array de 1 item visualmente para reusar o componente
  const statusOptions = ["Pago", "Pendente"];
  const statusSelected = filtroStatus
    ? [filtroStatus === "pago" ? "Pago" : "Pendente"]
    : [];

  const setStatusFromSelection = (
    newSelection: React.SetStateAction<string[]>,
  ) => {
    // Lógica para transformar array de volta em string única (comportamento de rádio)
    if (typeof newSelection === "function") {
      // Ignoramos updates funcionais complexos para simplificar aqui
      return;
    }
    // Se o usuário clicou em algo que já estava selecionado, limpa. Se clicou em novo, define.
    // O componente ResponsiveFilter sempre adiciona, então pegamos o último clicado
    const lastSelected = newSelection[newSelection.length - 1];

    if (!lastSelected) setFiltroStatus(null);
    else if (lastSelected === "Pago") setFiltroStatus("pago");
    else if (lastSelected === "Pendente") setFiltroStatus("pendente");

    // Hack visual: Se o usuário tentar selecionar os dois, mantemos só o último clicado
    // O componente ResponsiveFilter vai receber o estado atualizado na próxima renderização
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex w-max space-x-2 pb-2">
        {/* TIPO */}
        <ResponsiveFilter
          label="Tipo"
          title="Filtrar por Tipo"
          options={["Despesa", "Receita"]}
          selectedValues={filtrosTipo}
          setSelectedValues={setFiltrosTipo}
        />

        {/* CATEGORIA */}
        <ResponsiveFilter
          label="Categoria"
          title="Categorias"
          options={categoriasOptions.map((c) => c.nome)}
          selectedValues={filtrosCategoria}
          setSelectedValues={setFiltrosCategoria}
        />

        {/* PAGAMENTO */}
        <ResponsiveFilter
          label="Pagamento"
          title="Formas de Pagamento"
          options={pagamentoOptions.map((p) => p.nome)}
          selectedValues={filtrosPagamento}
          setSelectedValues={setFiltrosPagamento}
        />

        {/* STATUS (Customizado) */}
        {/* Como Status tem lógica diferente (única seleção), mantemos a lógica manual ou adaptamos */}
        <ResponsiveFilterStatus
          label="Status"
          currentStatus={filtroStatus}
          setStatus={setFiltroStatus}
        />
      </div>
    </ScrollArea>
  );
}

// Criamos um componente separado para o Status pois a lógica dele é "Single Select" (único)
const ResponsiveFilterStatus = ({ label, currentStatus, setStatus }: any) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = React.useState(false);

  const content = (
    <div className="flex flex-wrap gap-2">
      <Badge
        variant={currentStatus === "pago" ? "default" : "outline"}
        className="cursor-pointer px-3 py-1.5"
        onClick={() => setStatus(currentStatus === "pago" ? null : "pago")}
      >
        Realizado
      </Badge>
      <Badge
        variant={currentStatus === "pendente" ? "default" : "outline"}
        className="cursor-pointer px-3 py-1.5"
        onClick={() =>
          setStatus(currentStatus === "pendente" ? null : "pendente")
        }
      >
        Pendente
      </Badge>
    </div>
  );

  const trigger = (
    <div>
      <FilterPill label={label} isActive={!!currentStatus} />
    </div>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-[250px] p-4" align="start">
          <h4 className="font-medium leading-none mb-3 text-muted-foreground text-xs uppercase tracking-wider">
            Status
          </h4>
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl h-auto">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>Status</SheetTitle>
        </SheetHeader>
        {content}
        <SheetFooter className="mt-6">
          <SheetClose asChild>
            <Button className="w-full">Concluir</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
