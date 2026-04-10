// components/config/FixedExpensesCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid";

// Tipo para nossa despesa fixa
interface FixedExpense {
  id: string;
  name: string;
  amount: string;
  day: string;
}

export function FixedExpensesCard() {
  // Simulação de dados iniciais (Idealmente viria do Supabase)
  const [expenses, setExpenses] = useState<FixedExpense[]>([
    { id: "1", name: "Internet", amount: "120.00", day: "10" },
    { id: "2", name: "Netflix", amount: "55.90", day: "15" },
  ]);

  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDay, setNewDay] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const addExpense = () => {
    if (newName.trim() && newAmount.trim()) {
      const expense: FixedExpense = {
        id: Math.random().toString(36).substr(2, 9),
        name: newName.trim(),
        amount: newAmount.trim(),
        day: newDay.trim() || "1", // Dia 1 se não preencher
      };
      setExpenses([...expenses, expense]);
      // Limpa formulário
      setNewName("");
      setNewAmount("");
      setNewDay("");
    }
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // Calcula o total comprometido
  const totalFixed = expenses.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0,
  );

  return (
    <Card>
      <CardHeader></CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de Adição */}
        <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            Nova Despesa Fixa
          </Label>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome (ex: Luz)"
                className="h-9"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="R$"
                className="h-9"
              />
            </div>
            <div className="col-span-3 flex gap-1">
              <Input
                type="number"
                min="1"
                max="31"
                value={newDay}
                onChange={(e) => setNewDay(e.target.value)}
                placeholder="Dia"
                className="h-9"
              />
              <Button
                onClick={addExpense}
                size="icon"
                className="h-9 w-9 shrink-0"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Lista e Total */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label>Itens Cadastrados ({expenses.length})</Label>
              <span className="text-xs text-muted-foreground">
                Total Comprometido:{" "}
                <span className="font-bold text-red-500">
                  R$ {totalFixed.toFixed(2)}
                </span>
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className="h-4 w-4" /> Ocultar
                </>
              ) : (
                <>
                  <ChevronDownIcon className="h-4 w-4" /> Exibir
                </>
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                      {expense.day}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{expense.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Mensal
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      R$ {Number(expense.amount).toFixed(2)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeExpense(expense.id)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {expenses.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Nenhuma despesa fixa cadastrada.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
