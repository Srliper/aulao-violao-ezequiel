import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Timer, CalendarRange, Target, BellRing } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pratica")({
  head: () => ({
    meta: [
      { title: "Diário de Prática · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content: "Registre seus minutos de estudo no violão, acompanhe sua sequência de dias e evolua mais rápido.",
      },
      { property: "og:title", content: "Diário de Prática · Escola de Violão" },
      { property: "og:description", content: "Minutos praticados, sequência de dias e metas semanais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PraticaPage,
});

const SP_TZ = "America/Sao_Paulo";
const WEEK_GOAL = 150; // minutos por semana

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SP_TZ }).format(new Date());
}

function shiftISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Log = { id: string; practice_date: string; minutes: number; notes: string | null };

function PraticaPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const today = todayISO();

  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState("30");
  const [notes, setNotes] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["practice-logs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_logs")
        .select("id, practice_date, minutes, notes")
        .eq("user_id", user.id)
        .order("practice_date", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as Log[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const mins = Number(minutes);
      if (!Number.isFinite(mins) || mins <= 0) throw new Error("Informe os minutos praticados.");
      if (mins > 600) throw new Error("Máximo de 600 minutos por dia.");
      if (date > today) throw new Error("Não é possível registrar prática no futuro.");
      const { error } = await supabase.from("practice_logs").upsert(
        {
          user_id: user.id,
          practice_date: date,
          minutes: Math.round(mins),
          notes: notes.trim() || null,
        },
        { onConflict: "user_id,practice_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-logs", user.id] });
      setNotes("");
      toast.success("Prática registrada! 🎸");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practice_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-logs", user.id] });
      toast.success("Registro removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const list = logs ?? [];
    const byDate = new Map(list.map((l) => [l.practice_date, l.minutes]));

    // sequência (streak) contando de hoje ou de ontem
    let streak = 0;
    let cursor = byDate.has(today) ? today : shiftISO(today, -1);
    while ((byDate.get(cursor) ?? 0) > 0) {
      streak += 1;
      cursor = shiftISO(cursor, -1);
    }

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const iso = shiftISO(today, -(6 - i));
      return { iso, minutes: byDate.get(iso) ?? 0 };
    });
    const weekTotal = last7.reduce((s, d) => s + d.minutes, 0);
    const total = list.reduce((s, d) => s + d.minutes, 0);
    const maxDay = Math.max(60, ...last7.map((d) => d.minutes));

    return { streak, last7, weekTotal, total, maxDay, days: list.length };
  }, [logs, today]);

  const fmtH = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Timer className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diário de Prática</h1>
          <p className="text-sm text-muted-foreground">
            Cada minuto conta. Registre seu estudo e veja sua evolução.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="sm:ml-auto">
          <Link to="/dispositivos">
            <BellRing className="mr-2 h-4 w-4" /> Horário do lembrete
          </Link>
        </Button>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold leading-none">{stats.streak}</p>
              <p className="text-xs text-muted-foreground">
                {stats.streak === 1 ? "dia seguido" : "dias seguidos"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-8 w-8 text-primary" />
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{fmtH(stats.weekTotal)}</p>
              <p className="text-xs text-muted-foreground">
                nos últimos 7 dias · meta {fmtH(WEEK_GOAL)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarRange className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold leading-none">{fmtH(stats.total)}</p>
              <p className="text-xs text-muted-foreground">total em {stats.days} dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Semana</CardTitle>
          <CardDescription>
            {Math.min(100, Math.round((stats.weekTotal / WEEK_GOAL) * 100))}% da meta semanal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-2">
            {stats.last7.map((d) => (
              <div key={d.iso} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  {d.minutes || ""}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary/80 transition-all"
                  style={{ height: `${Math.max(4, (d.minutes / stats.maxDay) * 100)}%` }}
                  title={`${d.minutes} min`}
                />
                <span className="text-[10px] uppercase text-muted-foreground">
                  {new Date(`${d.iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Registrar prática</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pd">Dia</Label>
              <Input id="pd" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm">Minutos praticados</Label>
              <Input
                id="pm"
                type="number"
                min={1}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60].map((v) => (
              <Button key={v} type="button" variant="outline" size="sm" onClick={() => setMinutes(String(v))}>
                {v} min
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pn">O que você estudou? (opcional)</Label>
            <Textarea
              id="pn"
              rows={3}
              placeholder="Ex.: troca de acordes G–C–D, dedilhado PIMA, música nova…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full">
            {save.isPending ? "Salvando…" : "Salvar prática"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma prática registrada ainda. Comece hoje com 15 minutos!
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {new Date(`${l.practice_date}T12:00:00`).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {l.minutes} min
                      </span>
                    </p>
                    {l.notes && <p className="mt-1 text-xs text-muted-foreground">{l.notes}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => remove.mutate(l.id)}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
