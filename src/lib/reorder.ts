import { supabase } from "@/integrations/supabase/client";

type Orderable = { id: string; sort_order?: number | null };

/** Move o item de `from` para `to` e devolve o novo array. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Grava sort_order = índice para todos os itens que mudaram de posição. */
export async function persistOrder(
  table: "repertoire" | "gallery_photos",
  ordered: Orderable[],
) {
  const updates = ordered
    .map((row, index) => ({ id: row.id, index }))
    .filter(({ id, index }) => {
      const current = ordered.find((r) => r.id === id)?.sort_order ?? 0;
      return current !== index;
    });

  for (const { id, index } of updates) {
    const { error } = await supabase.from(table).update({ sort_order: index }).eq("id", id);
    if (error) throw error;
  }
}
