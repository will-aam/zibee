"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { authClient } from "@/lib/auth-client";
import {
  BookmarkSquareIcon,
  PlusIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NoteItem {
  id: string | number;
  texto: string;
  concluido: boolean;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = "zibee_financial_notes";

export function FinancialNotesWidget({ className }: { className?: string }) {
  const session = authClient.useSession();
  const userId = session.data?.user?.id;

  const [notes, setNotes] = React.useState<NoteItem[]>([]);
  const [newText, setNewText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);

  // Carregar notas (Supabase com fallback para localStorage)
  const loadNotes = React.useCallback(async () => {
    setIsLoading(true);
    let loadedFromDb = false;

    if (userId) {
      try {
        const { data, error } = await supabase
          .from("lembretes")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setNotes(
            data.map((item: any) => ({
              id: item.id,
              texto: item.texto,
              concluido: item.concluido,
              created_at: item.created_at,
            }))
          );
          loadedFromDb = true;
        }
      } catch (err) {
        console.warn("Tabela 'lembretes' não encontrada no DB, usando localStorage fallback.");
      }
    }

    if (!loadedFromDb) {
      try {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          setNotes(JSON.parse(localData));
        }
      } catch (e) {
        console.error("Erro ao ler localStorage:", e);
      }
    }

    setIsLoading(false);
  }, [userId]);

  React.useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Salvar no localStorage como backup local
  const saveLocalFallback = (updatedNotes: NoteItem[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedNotes));
    } catch (e) {
      console.error("Erro ao salvar localStorage:", e);
    }
  };

  // Adicionar Lembrete
  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;

    const tempId = Date.now().toString();
    const newNoteObj: NoteItem = {
      id: tempId,
      texto: trimmed,
      concluido: false,
      created_at: new Date().toISOString(),
    };

    const nextNotes = [newNoteObj, ...notes];
    setNotes(nextNotes);
    setNewText("");
    saveLocalFallback(nextNotes);

    if (userId) {
      try {
        const { data, error } = await supabase
          .from("lembretes")
          .insert([
            {
              user_id: userId,
              texto: trimmed,
              concluido: false,
            },
          ])
          .select();

        if (!error && data && data.length > 0) {
          setNotes((prev) =>
            prev.map((n) => (n.id === tempId ? { ...n, id: data[0].id } : n))
          );
        }
      } catch (err) {
        // Ignora erro do DB e mantém local
      }
    }
  };

  // Alternar Concluído
  const handleToggleConcluido = async (note: NoteItem) => {
    const nextConcluido = !note.concluido;
    const nextNotes = notes.map((n) =>
      n.id === note.id ? { ...n, concluido: nextConcluido } : n
    );
    setNotes(nextNotes);
    saveLocalFallback(nextNotes);

    if (userId && typeof note.id !== "string") {
      try {
        await supabase
          .from("lembretes")
          .update({ concluido: nextConcluido })
          .eq("id", note.id)
          .eq("user_id", userId);
      } catch (err) {
        // Ignora erro
      }
    }
  };

  // Excluir Lembrete
  const handleDeleteNote = async (id: string | number) => {
    const nextNotes = notes.filter((n) => n.id !== id);
    setNotes(nextNotes);
    saveLocalFallback(nextNotes);

    if (userId && typeof id !== "string") {
      try {
        await supabase.from("lembretes").delete().eq("id", id).eq("user_id", userId);
      } catch (err) {
        // Ignora erro
      }
    }
  };

  const pendingCount = notes.filter((n) => !n.concluido).length;

  return (
    <div
      className={cn(
        "bg-card border border-border/50 rounded-3xl p-5 shadow-sm space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <BookmarkSquareIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base leading-tight">
              Anotações e Lembretes
            </h3>
            <p className="text-xs text-muted-foreground">
              Cancelamentos, tarefas e metas rápidas
            </p>
          </div>
        </div>

        {pendingCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
          </span>
        )}
      </div>

      {/* Formulário de Adicionar */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Ex: Lembrar de cancelar plano do Dr. Inter..."
          className="h-10 rounded-xl text-sm bg-muted/30 border-border/60 focus:bg-background transition-colors"
        />
        <Button
          type="submit"
          disabled={!newText.trim()}
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          <PlusIcon className="w-5 h-5" />
        </Button>
      </form>

      {/* Lista de Lembretes */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
            Carregando lembretes...
          </div>
        ) : notes.length === 0 ? (
          <div className="py-6 text-center space-y-2 border border-dashed border-border/60 rounded-2xl p-4 bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground">
              Nenhum lembrete cadastrado.
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              Adicione recados rápidos para não esquecer cancelamentos ou pendências.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200",
                note.concluido
                  ? "bg-muted/20 border-border/30 opacity-70"
                  : "bg-muted/40 border-border/60 hover:border-primary/30"
              )}
            >
              <div
                onClick={() => handleToggleConcluido(note)}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 pr-2"
              >
                <button
                  type="button"
                  className="shrink-0 transition-transform active:scale-90"
                >
                  {note.concluido ? (
                    <CheckCircleSolid className="w-5 h-5 text-primary" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-sm font-medium leading-snug break-words flex-1",
                    note.concluido
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  )}
                >
                  {note.texto}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                title="Excluir lembrete"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
