"use client";

import { useState } from "react";
import { PlusIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Interface ajustada para aceitar qualquer objeto que tenha id e nome
export interface ListItem {
  id: number;
  nome: string;
}

interface ListManagerCardProps {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items?: ListItem[]; // Tornamos opcional (?) para evitar erro se vier undefined
  placeholderInput: string;
  onAdd: (nome: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}

export function ListManagerCard({
  title,
  icon: Icon,
  items = [], // Valor padrão: se vier undefined, assume array vazio []
  placeholderInput,
  onAdd,
  onRemove,
}: ListManagerCardProps) {
  const [newItem, setNewItem] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    try {
      setLoading(true);
      await onAdd(newItem.trim());
      setNewItem("");
      setIsAddingItem(false);
    } catch (error) {
      console.error("Erro ao adicionar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (id: number) => {
    try {
      await onRemove(id);
    } catch (error) {
      console.error("Erro ao remover:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {/* O ?.map garante segurança extra, mas o items=[] lá em cima já resolve */}
          {items?.map((item) => (
            <div
              key={item.id}
              className="group bg-secondary text-secondary-foreground rounded-md px-3 py-1 text-sm flex items-center gap-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <span>{item.nome}</span>
              <button
                onClick={() => handleRemoveItem(item.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}

          {!isAddingItem ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingItem(true)}
              className="h-7 text-xs"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          ) : (
            <div className="flex gap-1 items-center">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder={placeholderInput}
                className="h-7 text-xs w-40"
                autoFocus
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem();
                  if (e.key === "Escape") setIsAddingItem(false);
                }}
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddItem}
                disabled={loading}
              >
                {loading ? (
                  <ArrowPathIcon className="h-3 w-3 animate-spin" />
                ) : (
                  "Ok"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
