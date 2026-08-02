import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeacherContacts } from "@/lib/teachers.functions";

import { Send, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import bgConversa from "@/assets/bg-conversa.jpg";

export const Route = createFileRoute("/_authenticated/mensagens")({
  head: () => ({
    meta: [
      { title: "Mensagens · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content: "Converse diretamente com o professor sobre suas aulas de violão.",
      },
      { property: "og:title", content: "Mensagens · Escola de Violão Ezequiel Pereira" },
      {
        property: "og:description",
        content: "Chat direto entre aluno e professor da Escola de Violão Ezequiel Pereira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MensagensPage,
});

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function MensagensPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchTeachers = useServerFn(getTeacherContacts);
  const { data: admins, isLoading: loadingAdmins } = useQuery({
    queryKey: ["admin-ids"],
    queryFn: async () => {
      const rows = await fetchTeachers();
      return rows.map((r) => r.user_id);
    },
  });


  const isAdmin = !!admins?.includes(user.id);
  const teacherId = admins?.find((id) => id !== user.id) ?? admins?.[0] ?? null;

  const { data: students } = useQuery({
    queryKey: ["dm-students"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data.filter((p) => p.id !== user.id);
    },
  });

  // Todas as mensagens do professor (para prévia + não lidas por aluno)
  const { data: inbox } = useQuery({
    queryKey: ["dm-inbox", user.id],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Message[];
    },
  });

  const inboxByStudent = useMemo(() => {
    const map = new Map<string, { last: Message; unread: number }>();
    for (const m of inbox ?? []) {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const entry = map.get(other);
      const unread = m.sender_id !== user.id && !m.read_at ? 1 : 0;
      if (!entry) map.set(other, { last: m, unread });
      else entry.unread += unread;
    }
    return map;
  }, [inbox, user.id]);

  const orderedStudents = useMemo(() => {
    const list = students ?? [];
    return [...list].sort((a, b) => {
      const ta = inboxByStudent.get(a.id)?.last.created_at ?? "";
      const tb = inboxByStudent.get(b.id)?.last.created_at ?? "";
      if (ta === tb) return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      return tb.localeCompare(ta);
    });
  }, [students, inboxByStudent]);

  useEffect(() => {
    if (isAdmin && !selected && orderedStudents.length) setSelected(orderedStudents[0].id);
  }, [isAdmin, selected, orderedStudents]);

  const counterpart = isAdmin ? selected : teacherId;

  const { data: messages, isLoading } = useQuery({
    queryKey: ["dm", user.id, counterpart],
    enabled: !!counterpart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("id, sender_id, recipient_id, body, read_at, created_at")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${counterpart}),and(sender_id.eq.${counterpart},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dm", user.id, counterpart] });
    queryClient.invalidateQueries({ queryKey: ["dm-inbox", user.id] });
  }, [counterpart, queryClient, user.id]);

  // Tempo real: recebe e envia
  useEffect(() => {
    const channel = supabase
      .channel(`dm-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, user.id]);

  // Marca como lidas as mensagens recebidas da conversa aberta
  useEffect(() => {
    if (!counterpart || !messages?.length) return;
    const unreadIds = messages
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (!unreadIds.length) return;
    void supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["dm-inbox", user.id] });
      });
  }, [counterpart, messages, queryClient, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!counterpart) throw new Error("Nenhum destinatário disponível.");
      const body = text.trim();
      if (!body) throw new Error("Escreva uma mensagem.");
      const { error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: user.id, recipient_id: counterpart, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      refresh();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counterpartName = useMemo(() => {
    if (!isAdmin) return "Professor Ezequiel";
    return students?.find((s) => s.id === selected)?.full_name ?? "Aluno";
  }, [isAdmin, selected, students]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Fundo temático: sala de ensaio com violão sob luz quente */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,hsl(var(--background)),hsl(var(--background)))]" />
        <img
          src={bgConversa}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={1600}
          height={1000}
          className="h-full w-full object-cover object-[70%_50%] opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-background/90" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MessageCircle className="h-7 w-7 text-primary" />
            Mensagens
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Converse diretamente com seus alunos."
              : "Fale direto com o professor Ezequiel — ele recebe na hora."}
          </p>
        </div>

        <div className={cn("grid gap-4", isAdmin && "md:grid-cols-[280px_1fr]")}>
          {isAdmin && (
            <Card className="h-fit border-border/60 bg-card/80 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Alunos</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
                {orderedStudents.length ? (
                  orderedStudents.map((s) => {
                    const entry = inboxByStudent.get(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelected(s.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted",
                          selected === s.id && "bg-muted font-medium",
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {initials(s.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{s.full_name ?? "Sem nome"}</span>
                          {entry?.last ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {entry.last.sender_id === user.id ? "Você: " : ""}
                              {entry.last.body}
                            </span>
                          ) : null}
                        </span>
                        {entry?.unread ? (
                          <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
                            {entry.unread}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2 py-4 text-sm text-muted-foreground">
                    Nenhum aluno com conta ainda.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="flex h-[65vh] flex-col border-border/60 bg-card/85 backdrop-blur">
            <CardHeader className="border-b py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {initials(counterpartName)}
                  </AvatarFallback>
                </Avatar>
                {counterpartName}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 overflow-y-auto py-4">
              {loadingAdmins || isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-2/3" />
                  <Skeleton className="ml-auto h-10 w-1/2" />
                </div>
              ) : !counterpart ? (
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? "Selecione um aluno para conversar."
                    : "O professor ainda não está disponível."}
                </p>
              ) : messages?.length ? (
                messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm shadow-sm",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-muted text-foreground",
                        )}
                      >
                        {m.body}
                        <div className="mt-1 text-[10px] opacity-70">
                          {new Date(m.created_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                          {mine ? (m.read_at ? " · lida" : " · enviada") : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda. Diga um oi! 🎸
                </p>
              )}
              <div ref={bottomRef} />
            </CardContent>
            <div className="flex items-end gap-2 border-t p-3">
              <Textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua mensagem..."
                rows={2}
                maxLength={2000}
                disabled={!counterpart}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (text.trim()) send.mutate();
                  }
                }}
              />
              <Button
                onClick={() => send.mutate()}
                disabled={!counterpart || !text.trim() || send.isPending}
              >
                {send.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
