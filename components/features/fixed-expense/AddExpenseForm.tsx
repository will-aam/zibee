import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PlusIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ItemOpcao {
  id: number;
  nome: string;
}

interface AddExpenseFormProps {
  categorias: ItemOpcao[];
  pagamentos: ItemOpcao[];
  onAdd: (data: {
    nome: string;
    valor: number;
    dia_vencimento: number;
    categoria: string;
    forma_pagamento: string;
  }) => Promise<void>;
}

export function AddExpenseForm({
  categorias,
  pagamentos,
  onAdd,
}: AddExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pagamento, setPagamento] = useState("");

  const resetForm = () => {
    setNome("");
    setValor("");
    setDia("");
    setCategoria("");
    setPagamento("");
  };

  const handleSave = async () => {
    setAdding(true);
    try {
      await onAdd({
        nome: nome.trim(),
        valor: Number(valor),
        dia_vencimento: Number(dia),
        categoria: (categoria || "Contas Fixas").trim(),
        forma_pagamento: (pagamento || "Pix").trim(),
      });
      resetForm();
      setIsOpen(false);
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="w-full h-12 border-dashed border-border hover:bg-accent transition-all rounded-xl gap-2 text-muted-foreground"
      >
        <PlusIcon className="h-4 w-4" />
        Adicionar Nova Despesa
      </Button>
    );
  }

  return (
    <Card className="animate-in zoom-in-95 duration-200 border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg tracking-tight">Nova Conta</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              resetForm();
            }}
            className="h-8 w-8 p-0 rounded-full"
            disabled={adding}
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-12 items-end">
          <div className="md:col-span-3 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Nome
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Internet"
              autoFocus
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Valor (R$)
            </Label>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Vencimento (Dia)
            </Label>
            <Input
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              placeholder="Dia"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Categoria
            </Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Pagamento
            </Label>
            <Select value={pagamento} onValueChange={setPagamento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {pagamentos.map((f) => (
                  <SelectItem key={f.id} value={f.nome}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
            <Button
              onClick={handleSave}
              disabled={adding || !nome.trim() || !valor || !dia}
              className="w-full"
              title="Adicionar"
            >
              {adding ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
