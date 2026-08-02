import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TeacherContact = { user_id: string; full_name: string | null };

/**
 * Devolve os IDs dos professores (admins) sem expor a tabela de cargos
 * aos alunos. A checagem é feita no servidor com a sessão do usuário.
 */
export const getTeacherContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<TeacherContact[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (error) throw new Error("Não foi possível carregar os contatos do professor.");
    const ids = (data ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return ids.map((id) => ({ user_id: id, full_name: names.get(id) ?? null }));
  });
