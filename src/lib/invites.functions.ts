import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CLASS_TIMES = ["13:00", "14:30"] as const;

const inviteInput = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  class_time: z.enum(CLASS_TIMES),
});

const accountInput = inviteInput.extend({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

const tokenInput = z.object({ token: z.string().trim().min(1).max(64) });

const acceptInput = tokenInput.extend({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

function newToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cria um convite e devolve o código do link para o professor mandar no WhatsApp. */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteInput.parse(data))
  .handler(async ({ data, context }) => {
    const token = newToken();
    const { error } = await context.supabase.from("student_invites").insert({
      token,
      full_name: data.full_name,
      phone: data.phone || null,
      email: data.email || null,
      class_time: data.class_time,
      created_by: context.userId,
    });
    if (error) throw new Error("Não foi possível criar o convite. Só o professor pode fazer isso.");
    return { token };
  });

/** Professor cria a conta já com e-mail e senha definidos por ele. */
export const createStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => accountInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Apenas o professor pode criar contas de aluno.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone || null,
        class_time: data.class_time,
      },
    });
    if (error) {
      throw new Error(
        error.message.includes("already")
          ? "Já existe uma conta com esse e-mail."
          : "Não foi possível criar a conta do aluno.",
      );
    }
    return { ok: true as const };
  });

/** Rota pública do convite: devolve apenas o nome e a turma. */
export const getInvite = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("student_invites")
      .select("full_name, class_time, email, used_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { status: "invalid" as const };
    if (row.used_at) return { status: "used" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" as const };
    return {
      status: "ok" as const,
      full_name: row.full_name,
      class_time: row.class_time,
      email: row.email,
    };
  });

/** O aluno abre o link e escolhe o próprio e-mail e senha. */
export const acceptInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => acceptInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("student_invites")
      .select("id, full_name, phone, class_time, used_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) throw new Error("Convite inválido.");
    if (row.used_at) throw new Error("Este convite já foi usado.");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Este convite expirou.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: row.full_name,
        phone: row.phone,
        class_time: row.class_time,
      },
    });
    if (error || !created.user) {
      throw new Error(
        error?.message.includes("already")
          ? "Já existe uma conta com esse e-mail. Faça login."
          : "Não foi possível criar sua conta.",
      );
    }

    await supabaseAdmin
      .from("student_invites")
      .update({ used_at: new Date().toISOString(), used_by: created.user.id })
      .eq("id", row.id);

    return { ok: true as const };
  });
