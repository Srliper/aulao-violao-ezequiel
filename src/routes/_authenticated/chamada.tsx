import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Send, ArrowLeft, FileDown, FileText, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { exportAttendanceCSV, exportAttendancePDF } from "@/lib/attendance-export";

type Status = "present" | "absent" | "late";
type Turma = "13:00" | "14:30";

type Person = {
  key: string;
  id: string;
  full_name: string | null;
  class_time: string | null;
  kind: "user" | "roster";
};


export const Route = createFileRoute("/_authenticated/chamada")({
  head: () => ({
    meta: [
      { title: "Chamada · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Faça a chamada da turma e envie a lista de presença do dia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw redirect({ to: "/dashboard" });
  },
  component: ChamadaPage,
});

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<Status, string> = {
  present: "Presente",
  absent: "Faltou",
  late: "Atrasado",
};

function ChamadaPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [turma, setTurma] = useState<Turma>("14:30");
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [novoNome, setNovoNome] = useState("");

  const { data: people, isLoading } = useQuery({
    queryKey: ["chamada-people"],
    queryFn: async () => {
      const list: Person[] = [];

      const { data: roleRows, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");
      if (rolesErr) throw rolesErr;
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (ids.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, class_time")
          .in("id", ids)
          .order("full_name", { ascending: true });
        if (error) throw error;
        for (const p of data ?? []) {
          list.push({ key: `u:${p.id}`, id: p.id, full_name: p.full_name, class_time: p.class_time, kind: "user" });
        }
      }

      const { data: roster, error: rosterErr } = await supabase
        .from("students")
        .select("id, full_name, class_time, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (rosterErr) throw rosterErr;
      for (const s of roster ?? []) {
        list.push({ key: `r:${s.id}`, id: s.id, full_name: s.full_name, class_time: s.class_time, kind: "roster" });
      }

      return list;
    },
  });

  const turmaStudents = useMemo(
    () => (people ?? []).filter((s) => (s.class_time ?? "13:00") === turma),
    [people, turma],
  );

  // Carrega chamada já enviada para a data/turma selecionada
  const { data: existing } = useQuery({
    queryKey: ["chamada-existing", date, turma],
    queryFn: async () => {
      const [users, roster] = await Promise.all([
        supabase.from("attendance").select("user_id, status").eq("class_date", date).eq("class_time", turma),
        supabase.from("roster_attendance").select("student_id, status").eq("class_date", date).eq("class_time", turma),
      ]);
      if (users.error) throw users.error;
      if (roster.error) throw roster.error;
      const map: Record<string, Status> = {};
      for (const r of users.data ?? []) map[`u:${r.user_id}`] = r.status as Status;
      for (const r of roster.data ?? []) map[`r:${r.student_id}`] = r.status as Status;
      return map;
    },
  });

  useEffect(() => {
    const base: Record<string, Status> = {};
    for (const s of turmaStudents) base[s.key] = "present";
    for (const [k, v] of Object.entries(existing ?? {})) base[k] = v;
    setMarks(base);
  }, [existing, turmaStudents]);

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0 };
    for (const s of turmaStudents) c[marks[s.key] ?? "present"]++;
    return c;
  }, [turmaStudents, marks]);

  const addStudent = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase.from("students").insert({
        full_name: nome,
        class_time: turma,
        sort_order: turmaStudents.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovoNome("");
      toast.success("Aluno adicionado à lista 🎸");
      queryClient.invalidateQueries({ queryKey: ["chamada-people"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível adicionar."),
  });

  const removeStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aluno removido da lista.");
      queryClient.invalidateQueries({ queryKey: ["chamada-people"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível remover."),
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (turmaStudents.length === 0) throw new Error("Nenhum aluno nesta turma.");
      const users = turmaStudents.filter((s) => s.kind === "user");
      const roster = turmaStudents.filter((s) => s.kind === "roster");

      const delUsers = await supabase
        .from("attendance")
        .delete()
        .eq("class_date", date)
        .eq("class_time", turma);
      if (delUsers.error) throw delUsers.error;
      const delRoster = await supabase
        .from("roster_attendance")
        .delete()
        .eq("class_date", date)
        .eq("class_time", turma);
      if (delRoster.error) throw delRoster.error;

      if (users.length > 0) {
        const { error } = await supabase.from("attendance").insert(
          users.map((s) => ({
            user_id: s.id,
            class_date: date,
            class_time: turma,
            status: marks[s.key] ?? "present",
            checked_in_by: user.id,
          })),
        );
        if (error) throw error;
      }

      if (roster.length > 0) {
        const { error } = await supabase.from("roster_attendance").insert(
          roster.map((s) => ({
            student_id: s.id,
            class_date: date,
            class_time: turma,
            status: marks[s.key] ?? "present",
            created_by: user.id,
          })),
        );
        if (error) throw error;
      }

      // Avisa cada aluno com conta que a chamada do dia foi publicada
      const dataBR = new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      });
      if (users.length > 0) {
        const { error: notifErr } = await supabase.from("notifications").insert(
          users.map((s) => ({
            user_id: s.id,
            title: `Chamada de ${dataBR} publicada`,
            body: `Turma de sábado ${turma} · sua presença foi registrada como "${STATUS_LABEL[marks[s.key] ?? "present"]}".`,
            link: "/presenca",
          })),
        );
        if (notifErr) throw notifErr;
      }

      return turmaStudents.length;
    },
    onSuccess: (n) => {
      toast.success(`Lista enviada com ${n} aluno(s) 🎸`);
      queryClient.invalidateQueries({ queryKey: ["chamada-existing", date, turma] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar a lista."),
  });

  const exportRows = turmaStudents.map((s) => ({
    nome: s.full_name ?? "Sem nome",
    status: STATUS_LABEL[marks[s.key] ?? "present"],
  }));


  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chamada</h1>
          <p className="text-sm text-muted-foreground">Marque os alunos e envie a lista de presença do dia.</p>
        </div>
      </header>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
            <Label htmlFor="data" className="text-xs text-muted-foreground">Data da aula</Label>
            <Input id="data" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Turma</Label>
            <Tabs value={turma} onValueChange={(v) => setTurma(v as Turma)} className="mt-1">
              <TabsList>
                <TabsTrigger value="13:00">Sábado 13h</TabsTrigger>
                <TabsTrigger value="14:30">Sábado 14h30</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 space-y-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Alunos ({turmaStudents.length})</CardTitle>
            <div className="flex gap-1.5 text-xs">
              <Badge variant="secondary">{counts.present} presentes</Badge>
              <Badge variant="secondary">{counts.late} atrasados</Badge>
              <Badge variant="secondary">{counts.absent} faltas</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exportRows.length === 0}
              onClick={() => exportAttendanceCSV(exportRows, date, turma)}
            >
              <FileDown className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exportRows.length === 0}
              onClick={() => exportAttendancePDF(exportRows, date, turma)}
            >
              <FileText className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const nome = novoNome.trim();
              if (nome.length < 2) return;
              addStudent.mutate(nome);
            }}
          >
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Adicionar aluno à lista (ex.: Leonice)"
              className="h-9"
            />
            <Button type="submit" size="sm" className="gap-1.5" disabled={addStudent.isPending}>
              <UserPlus className="h-4 w-4" /> Adicionar
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : turmaStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum aluno nesta turma.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {turmaStudents.map((s, idx) => {
                const current = marks[s.key] ?? "present";
                return (
                  <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-right text-xs text-muted-foreground">{idx + 1}</span>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(s.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm font-medium">{s.full_name ?? "Sem nome"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(["present", "late", "absent"] as Status[]).map((st) => (
                        <Button
                          key={st}
                          type="button"
                          size="sm"
                          variant={current === st ? "default" : "outline"}
                          onClick={() => setMarks((m) => ({ ...m, [s.key]: st }))}
                        >
                          {STATUS_LABEL[st]}
                        </Button>
                      ))}
                      {s.kind === "roster" && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeStudent.mutate(s.id)}
                          aria-label={`Remover ${s.full_name ?? "aluno"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}

            </ul>
          )}
        </CardContent>
      </Card>

      <Button
        className="mt-6 w-full gap-2"
        size="lg"
        disabled={enviar.isPending || turmaStudents.length === 0}
        onClick={() => enviar.mutate()}
      >
        <Send className="h-4 w-4" />
        {enviar.isPending ? "Enviando…" : "Enviar lista de presença"}
      </Button>
    </div>
  );
}
