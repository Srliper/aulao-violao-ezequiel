import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas da Aula · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content: "Deveres de casa do professor Ezequiel: exercícios, músicas e prazos para cada turma.",
      },
      { property: "og:title", content: "Tarefas da Aula · Escola de Violão" },
      { property: "og:description", content: "Acompanhe os deveres de casa e marque o que já concluiu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TarefasPage,
});

const TURMAS = ["13:00", "14:30"];
const ALL = "__all__";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  class_time: string | null;
  assignee_id: string | null;
  created_at: string;
};

function TarefasPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: isStaff } = useQuery({
    queryKey: ["is-staff", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "mentor"]);
      return !!data && data.length > 0;
    },
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, description, due_date, class_time, assignee_id, created_at")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const { data: done } = useQuery({
    queryKey: ["assignment-completions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_completions")
        .select("assignment_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.assignment_id));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("assignment_completions")
          .delete()
          .eq("assignment_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("assignment_completions")
          .insert({ assignment_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignment-completions", user.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Tarefa removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { pending, completed } = useMemo(() => {
    const list = assignments ?? [];
    return {
      pending: list.filter((a) => !done?.has(a.id)),
      completed: list.filter((a) => done?.has(a.id)),
    };
  }, [assignments, done]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas da Aula</h1>
          <p className="text-sm text-muted-foreground">
            Deveres de casa enviados pelo professor. Marque o que já concluiu.
          </p>
        </div>
      </header>

      {isStaff && <TeacherForm />}

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">A fazer ({pending.length})</TabsTrigger>
          <TabsTrigger value="done">Concluídas ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente. Bom estudo! 🎸</p>
          ) : (
            pending.map((a) => (
              <TaskCard
                key={a.id}
                task={a}
                completed={false}
                canDelete={!!isStaff}
                onToggle={() => toggle.mutate({ id: a.id, completed: false })}
                onDelete={() => remove.mutate(a.id)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="done" className="space-y-3">
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda nada concluído por aqui.</p>
          ) : (
            completed.map((a) => (
              <TaskCard
                key={a.id}
                task={a}
                completed
                canDelete={!!isStaff}
                onToggle={() => toggle.mutate({ id: a.id, completed: true })}
                onDelete={() => remove.mutate(a.id)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskCard({
  task,
  completed,
  canDelete,
  onToggle,
  onDelete,
}: {
  task: Assignment;
  completed: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const overdue =
    !completed && !!task.due_date && task.due_date < new Date().toISOString().slice(0, 10);

  return (
    <Card className={completed ? "border-border/50 opacity-70" : "border-border/60"}>
      <CardContent className="flex items-start gap-3 p-4">
        <Checkbox checked={completed} onCheckedChange={onToggle} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${completed ? "line-through" : ""}`}>{task.title}</p>
          {task.description && (
            <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            {task.due_date && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                  overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                }`}
              >
                {completed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {overdue ? "Atrasada · " : "Até "}
                {new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {task.assignee_id
                ? "Individual"
                : task.class_time
                  ? `Turma sábado ${task.class_time}`
                  : "Todas as turmas"}
            </span>
          </div>
        </div>
        {canDelete && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onDelete}>
            Excluir
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TeacherForm() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classTime, setClassTime] = useState<string>(ALL);
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 3) throw new Error("Dê um título com pelo menos 3 caracteres.");
      const { error } = await supabase.from("assignments").insert({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        class_time: classTime === ALL ? null : classTime,
      });
      if (error) throw error;

      // avisa os alunos da turma
      const query = supabase.from("profiles").select("id");
      const { data: students } = classTime === ALL ? await query : await query.eq("class_time", classTime);
      if (students && students.length > 0) {
        await supabase.from("notifications").insert(
          students.map((s) => ({
            user_id: s.id,
            title: `Nova tarefa: ${title.trim()}`,
            body: dueDate
              ? `Prazo: ${new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-BR")}`
              : "Confira os detalhes na tela de tarefas.",
            link: "/tarefas",
          })),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setTitle("");
      setDescription("");
      setDueDate("");
      toast.success("Tarefa enviada aos alunos");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mb-6 border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Criar tarefa</CardTitle>
            <CardDescription>Envie um dever de casa para uma turma ou para todos.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Fechar" : "Nova tarefa"}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Título</Label>
            <Input
              id="t-title"
              placeholder="Ex.: Praticar troca G–C–D em 60 bpm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Descrição (opcional)</Label>
            <Textarea
              id="t-desc"
              rows={3}
              placeholder="Detalhe o exercício, a música e o tempo de estudo sugerido."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-due">Prazo (opcional)</Label>
              <Input id="t-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select value={classTime} onValueChange={setClassTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as turmas</SelectItem>
                  {TURMAS.map((t) => (
                    <SelectItem key={t} value={t}>
                      Sábado {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending} className="rounded-full">
            {create.isPending ? "Enviando…" : "Enviar tarefa"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
