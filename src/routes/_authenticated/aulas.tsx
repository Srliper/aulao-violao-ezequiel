import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, Check, Repeat, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_TIMES = ["13:00", "14:30"] as const;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const Route = createFileRoute("/_authenticated/aulas")({
  head: () => ({
    meta: [
      { title: "Agenda de Aulas · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content: "Crie e gerencie a agenda de sábados com repetição semanal e avise a turma.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AulasPage,
});

/** Data local (sem UTC) no formato YYYY-MM-DD. */
function toISODate(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function nextSaturdayISO(from = new Date()) {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return toISODate(d);
}

/** Gera N datas semanais a partir de uma data inicial (mesmo dia da semana). */
function weeklyDates(startISO: string, weeks: number) {
  const out: string[] = [];
  const d = fromISODate(startISO);
  for (let i = 0; i < weeks; i++) {
    out.push(toISODate(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function nextSaturdays(count = 8) {
  return weeklyDates(nextSaturdayISO(), count);
}

function formatDate(iso: string) {
  return fromISODate(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatShort(iso: string) {
  return fromISODate(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type ScheduleRow = {
  id: string;
  class_date: string;
  class_time: string;
  will_happen: boolean;
  note: string | null;
};

function AulasPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [turma, setTurma] = useState<string>("14:30");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  // Formulário de repetição semanal
  const [startDate, setStartDate] = useState(() => nextSaturdayISO());
  const [weeks, setWeeks] = useState("8");
  const [times, setTimes] = useState<string[]>([...DEFAULT_TIMES]);
  const [customTime, setCustomTime] = useState("");
  const [recurrenceNote, setRecurrenceNote] = useState("");
  const [notifyStudents, setNotifyStudents] = useState(true);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const saturdays = useMemo(() => nextSaturdays(8), []);
  const todayISO = useMemo(() => toISODate(new Date()), []);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["class-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_schedule")
        .select("id, class_date, class_time, will_happen, note")
        .gte("class_date", todayISO)
        .order("class_date")
        .order("class_time");
      if (error) throw error;
      return data as ScheduleRow[];
    },
  });

  const knownTimes = useMemo(() => {
    const set = new Set<string>(DEFAULT_TIMES);
    (schedule ?? []).forEach((s) => set.add(s.class_time));
    return [...set].sort();
  }, [schedule]);

  const notifyEveryone = async (title: string, body: string) => {
    const { data: people } = await supabase.from("profiles").select("id");
    const others = (people ?? []).filter((p) => p.id !== user.id);
    if (!others.length) return;
    await supabase
      .from("notifications")
      .insert(others.map((p) => ({ user_id: p.id, title, body, link: "/aulas" })));
  };

  const save = useMutation({
    mutationFn: async ({ date, willHappen }: { date: string; willHappen: boolean }) => {
      setPending(date + turma);
      const { error } = await supabase.from("class_schedule").upsert(
        {
          class_date: date,
          class_time: turma,
          will_happen: willHappen,
          note: note.trim() || null,
          created_by: user.id,
        },
        { onConflict: "class_date,class_time" },
      );
      if (error) throw error;

      await notifyEveryone(
        willHappen
          ? `Aula confirmada — ${formatDate(date)} às ${turma}`
          : `Sem aula — ${formatDate(date)} às ${turma}`,
        note.trim() || (willHappen ? "Nos vemos na aulinha!" : "A aulinha deste dia foi cancelada."),
      );
    },
    onSuccess: () => {
      setNote("");
      setPending(null);
      toast.success("Agenda atualizada e alunos avisados!");
      queryClient.invalidateQueries({ queryKey: ["class-schedule"] });
    },
    onError: (e: Error) => {
      setPending(null);
      toast.error(e.message);
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!startDate) throw new Error("Escolha a data inicial.");
      const start = fromISODate(startDate);
      if (Number.isNaN(start.getTime())) throw new Error("Data inicial inválida.");
      if (startDate < todayISO) throw new Error("Escolha uma data de hoje em diante.");

      const selected = [...new Set(times.map((t) => t.trim()).filter(Boolean))].sort();
      if (!selected.length) throw new Error("Selecione ao menos um horário de turma.");
      const invalid = selected.find((t) => !TIME_RE.test(t));
      if (invalid) throw new Error(`Horário inválido: ${invalid}. Use o formato HH:MM.`);

      const total = Number(weeks);
      if (!Number.isInteger(total) || total < 1 || total > 52)
        throw new Error("Número de semanas inválido.");

      const dates = weeklyDates(startDate, total);

      // Evita duplicidade: consulta o que já existe no intervalo
      const { data: existing, error: exErr } = await supabase
        .from("class_schedule")
        .select("class_date, class_time")
        .gte("class_date", dates[0])
        .lte("class_date", dates[dates.length - 1]);
      if (exErr) throw exErr;
      const taken = new Set((existing ?? []).map((r) => `${r.class_date}|${r.class_time}`));

      const rows = dates.flatMap((date) =>
        selected
          .filter((time) => !taken.has(`${date}|${time}`))
          .map((time) => ({
            class_date: date,
            class_time: time,
            will_happen: true,
            note: recurrenceNote.trim() || null,
            created_by: user.id,
          })),
      );

      const skipped = dates.length * selected.length - rows.length;

      if (rows.length) {
        // ignoreDuplicates protege contra corridas concorrentes
        const { error } = await supabase
          .from("class_schedule")
          .upsert(rows, { onConflict: "class_date,class_time", ignoreDuplicates: true });
        if (error) throw error;

        if (notifyStudents) {
          const weekday = fromISODate(dates[0]).toLocaleDateString("pt-BR", { weekday: "long" });
          await notifyEveryone(
            `Agenda publicada: ${total} ${weekday}${total > 1 ? "s" : ""} a partir de ${formatShort(dates[0])}`,
            recurrenceNote.trim() ||
              `Turmas: ${selected.join(" e ")}. Confira a agenda completa no app.`,
          );
        }
      }

      return { created: rows.length, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      toast.success(
        created
          ? `${created} aula(s) criada(s)${skipped ? ` · ${skipped} já existia(m)` : ""}.`
          : "Nenhuma aula nova: todas essas datas já estavam na agenda.",
      );
      setRecurrenceNote("");
      queryClient.invalidateQueries({ queryKey: ["class-schedule"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("class_schedule").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aula removida da agenda.");
      queryClient.invalidateQueries({ queryKey: ["class-schedule"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTime = (time: string, checked: boolean) =>
    setTimes((prev) => (checked ? [...new Set([...prev, time])] : prev.filter((t) => t !== time)));

  const addCustomTime = () => {
    const t = customTime.trim();
    if (!TIME_RE.test(t)) {
      toast.error("Informe um horário válido no formato HH:MM.");
      return;
    }
    setTimes((prev) => [...new Set([...prev, t])]);
    setCustomTime("");
  };

  const preview = useMemo(() => {
    if (!startDate || !TIME_RE.test("00:00")) return [];
    const total = Number(weeks);
    if (!Number.isInteger(total) || total < 1) return [];
    return weeklyDates(startDate, Math.min(total, 4));
  }, [startDate, weeks]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <CalendarDays className="h-7 w-7 text-primary" />
          Agenda de Aulas
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Crie a agenda com repetição semanal, confirme ou cancele cada sábado e avise a turma."
            : "Confira se a aulinha de sábado vai acontecer."}
        </p>
      </div>

      {isAdmin && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="h-4 w-4 text-primary" />
              Criar agenda recorrente
            </CardTitle>
            <CardDescription>
              Repete semanalmente a partir da data escolhida (mesmo dia da semana). Datas que já
              existem são mantidas como estão, sem duplicar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Primeira aula</Label>
                <Input
                  id="inicio"
                  type="date"
                  min={todayISO}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground capitalize">
                  {startDate ? formatDate(startDate) : "—"}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Repetir por</Label>
                <Select value={weeks} onValueChange={setWeeks}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["4", "8", "12", "16", "24", "52"].map((w) => (
                      <SelectItem key={w} value={w}>
                        {w} semanas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horários das turmas</Label>
              <div className="flex flex-wrap gap-3">
                {knownTimes.map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={times.includes(t)}
                      onCheckedChange={(c) => toggleTime(t, c === true)}
                    />
                    {t}
                  </label>
                ))}
                {times
                  .filter((t) => !knownTimes.includes(t))
                  .map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <Checkbox checked onCheckedChange={() => toggleTime(t, false)} />
                      {t}
                    </label>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="Outro horário (HH:MM)"
                  inputMode="numeric"
                  className="max-w-[180px]"
                />
                <Button type="button" variant="outline" onClick={addCustomTime}>
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recado-recorrente">Recado padrão (opcional)</Label>
              <Input
                id="recado-recorrente"
                value={recurrenceNote}
                onChange={(e) => setRecurrenceNote(e.target.value)}
                placeholder="Ex.: Traga o violão afinado e o caderno de cifras"
                maxLength={200}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={notifyStudents}
                onCheckedChange={(c) => setNotifyStudents(c === true)}
              />
              Avisar os alunos ao publicar a agenda
            </label>

            {preview.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Começa em: {preview.map(formatShort).join(" · ")}
                {Number(weeks) > preview.length ? " …" : ""}
              </p>
            )}

            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              {generate.isPending ? "Gerando..." : "Gerar agenda"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3">
          <CardTitle className="text-base">Próximos sábados</CardTitle>
          <Tabs value={turma} onValueChange={setTurma}>
            <TabsList>
              {knownTimes.map((t) => (
                <TabsTrigger key={t} value={t}>
                  Turma {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="recado">Recado (opcional)</Label>
              <Input
                id="recado"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Traga o violão afinado e um lanchinho"
                maxLength={200}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (
            [
              ...new Set([
                ...saturdays,
                ...(schedule ?? []).filter((s) => s.class_time === turma).map((s) => s.class_date),
              ]),
            ]
              .sort()
              .map((date) => {
                const row = schedule?.find((s) => s.class_date === date && s.class_time === turma);
                const busy = pending === date + turma;
                return (
                  <div
                    key={date}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div>
                      <p className="font-medium capitalize">{formatDate(date)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {row ? (
                          <Badge variant={row.will_happen ? "default" : "destructive"}>
                            {row.will_happen ? "Vai ter aula" : "Sem aula"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">A confirmar</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">às {turma}</span>
                        {row?.note && (
                          <span className="text-xs text-muted-foreground">· {row.note}</span>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={row?.will_happen ? "default" : "outline"}
                          disabled={busy}
                          onClick={() => save.mutate({ date, willHappen: true })}
                        >
                          <Check className="mr-1 h-4 w-4" /> Vai ter
                        </Button>
                        <Button
                          size="sm"
                          variant={row && !row.will_happen ? "destructive" : "outline"}
                          disabled={busy}
                          onClick={() => save.mutate({ date, willHappen: false })}
                        >
                          <X className="mr-1 h-4 w-4" /> Não vai ter
                        </Button>
                        {row && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={removeEntry.isPending}
                            onClick={() => removeEntry.mutate(row.id)}
                            aria-label="Remover da agenda"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
