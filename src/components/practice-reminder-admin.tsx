import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultPrefs,
  practiceFrequencies,
  practiceFrequencyId,
  practiceHourOptions,
  weekdayOptions,
} from "@/lib/push-devices";

type Scope = "all" | "13:00" | "14:30" | string; // string = user id do aluno

type Profile = { id: string; full_name: string | null; class_time: string | null };
type Prefs = {
  user_id: string;
  notify_practice: boolean;
  practice_reminder_hour: number;
  practice_reminder_days: number[] | null;
};
type Rule = {
  id: string;
  title: string;
  discipline: string | null;
  level: string | null;
  scope_type: "all" | "class" | "student";
  class_time: string | null;
  student_id: string | null;
  reminder_hour: number;
  reminder_days: number[];
  enabled: boolean;
};

const NONE = "__none__";

/** Disciplinas sugeridas (pode digitar outra). */
const disciplineSuggestions = [
  "Violão",
  "Ritmo",
  "Dedilhado",
  "Teoria musical",
  "Canto",
  "Repertório",
];

/** Níveis alinhados ao repertório/patentes. */
const levelSuggestions = ["Iniciante", "Intermediário", "Avançado"];

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function daysLabel(days: number[] | null | undefined) {
  const list = days ?? defaultPrefs.practice_reminder_days;
  const id = practiceFrequencyId(list);
  if (id !== "custom") return practiceFrequencies.find((f) => f.id === id)!.label;
  return list
    .slice()
    .sort()
    .map((d) => weekdayOptions.find((w) => w.value === d)?.short)
    .join(", ");
}

function WeekdayPicker({
  days,
  onChange,
}: {
  days: number[];
  onChange: (days: number[]) => void;
}) {
  const freqId = practiceFrequencyId(days);
  return (
    <div className="space-y-2">
      <Select
        value={freqId}
        onValueChange={(v) => {
          const preset = practiceFrequencies.find((f) => f.id === v);
          if (preset && preset.id !== "custom") onChange([...preset.days]);
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {practiceFrequencies.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-3 pt-1">
        {weekdayOptions.map((w) => (
          <label key={w.value} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={days.includes(w.value)}
              onCheckedChange={(c) =>
                onChange(c ? [...days, w.value] : days.filter((d) => d !== w.value))
              }
            />
            {w.short}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Painel do professor para configurar os lembretes do Diário de Prática:
 * regras por disciplina/nível (todos, turma ou aluno) e o lembrete pessoal padrão.
 */
export function PracticeReminderAdmin() {
  const profilesQuery = useQuery({
    queryKey: ["admin-profiles-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, class_time")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const profiles = profilesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <RulesPanel profiles={profiles} loadingProfiles={profilesQuery.isLoading} />
      <PersonalPanel profiles={profiles} loadingProfiles={profilesQuery.isLoading} />
    </div>
  );
}

/* ---------------- Regras por disciplina / nível ---------------- */

function RulesPanel({
  profiles,
  loadingProfiles,
}: {
  profiles: Profile[];
  loadingProfiles: boolean;
}) {
  const queryClient = useQueryClient();
  const [discipline, setDiscipline] = useState(disciplineSuggestions[0]);
  const [customDiscipline, setCustomDiscipline] = useState("");
  const [level, setLevel] = useState<string>(NONE);
  const [scope, setScope] = useState<"all" | "class" | "student">("all");
  const [classTime, setClassTime] = useState("14:30");
  const [studentId, setStudentId] = useState<string>("");
  const [hour, setHour] = useState(defaultPrefs.practice_reminder_hour);
  const [days, setDays] = useState<number[]>([...defaultPrefs.practice_reminder_days]);

  const rulesQuery = useQuery({
    queryKey: ["practice-reminder-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_reminder_rules")
        .select(
          "id, title, discipline, level, scope_type, class_time, student_id, reminder_hour, reminder_days, enabled",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Rule[];
    },
  });

  const nameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of profiles) map[p.id] = p.full_name ?? "Aluno sem nome";
    return map;
  }, [profiles]);

  const create = useMutation({
    mutationFn: async () => {
      const disc = (discipline === "__custom__" ? customDiscipline : discipline).trim();
      if (!disc) throw new Error("Informe a disciplina.");
      if (days.length === 0) throw new Error("Escolha pelo menos um dia da semana.");
      if (scope === "student" && !studentId) throw new Error("Escolha o aluno.");
      const { error } = await supabase.from("practice_reminder_rules").insert({
        title: disc,
        discipline: disc,
        level: level === NONE ? null : level,
        scope_type: scope,
        class_time: scope === "class" ? classTime : null,
        student_id: scope === "student" ? studentId : null,
        reminder_hour: hour,
        reminder_days: days.slice().sort(),
        enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lembrete criado.");
      setCustomDiscipline("");
      queryClient.invalidateQueries({ queryKey: ["practice-reminder-rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("practice_reminder_rules")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["practice-reminder-rules"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practice_reminder_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lembrete removido.");
      queryClient.invalidateQueries({ queryKey: ["practice-reminder-rules"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function scopeLabel(r: Rule) {
    if (r.scope_type === "all") return "Todos os alunos";
    if (r.scope_type === "class") return `Turma ${r.class_time}`;
    return nameById[r.student_id ?? ""] ?? "Aluno";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-primary" /> Novo lembrete por disciplina/nível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {disciplineSuggestions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Outra…</SelectItem>
              </SelectContent>
            </Select>
            {discipline === "__custom__" && (
              <Input
                placeholder="Ex.: Leitura rítmica"
                value={customDiscipline}
                onChange={(e) => setCustomDiscipline(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Todos os níveis</SelectItem>
                {levelSuggestions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Aplicar para</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os alunos</SelectItem>
                <SelectItem value="class">Uma turma</SelectItem>
                <SelectItem value="student">Um aluno</SelectItem>
              </SelectContent>
            </Select>
            {scope === "class" && (
              <Select value={classTime} onValueChange={setClassTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="13:00">Turma 13h</SelectItem>
                  <SelectItem value="14:30">Turma 14h30</SelectItem>
                </SelectContent>
              </Select>
            )}
            {scope === "student" && (
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProfiles ? "Carregando…" : "Escolha o aluno"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? "Aluno sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {practiceHourOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frequência</Label>
            <WeekdayPicker days={days} onChange={setDays} />
          </div>

          <Button
            className="w-full gap-2"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus className="h-4 w-4" /> Criar lembrete
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lembretes por disciplina/nível</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rulesQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (rulesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum lembrete criado. Comece pela disciplina ao lado.
            </p>
          ) : (
            (rulesQuery.data ?? []).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {r.discipline ?? r.title}
                    {r.level && <Badge variant="secondary">{r.level}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scopeLabel(r)} · {hourLabel(r.reminder_hour)} · {daysLabel(r.reminder_days)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(enabled) => toggle.mutate({ id: r.id, enabled })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(r.id)}
                    aria-label="Remover lembrete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Lembrete pessoal padrão ---------------- */

function PersonalPanel({
  profiles,
  loadingProfiles,
}: {
  profiles: Profile[];
  loadingProfiles: boolean;
}) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>("all");
  const [enabled, setEnabled] = useState(true);
  const [hour, setHour] = useState<number>(defaultPrefs.practice_reminder_hour);
  const [days, setDays] = useState<number[]>([...defaultPrefs.practice_reminder_days]);

  const prefsQuery = useQuery({
    queryKey: ["admin-notification-prefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_prefs")
        .select("user_id, notify_practice, practice_reminder_hour, practice_reminder_days");
      if (error) throw error;
      return (data ?? []) as Prefs[];
    },
  });

  const prefsById = useMemo(() => {
    const map: Record<string, Prefs> = {};
    for (const p of prefsQuery.data ?? []) map[p.user_id] = p;
    return map;
  }, [prefsQuery.data]);

  const targets = useMemo(() => {
    if (scope === "all") return profiles;
    if (scope === "13:00" || scope === "14:30")
      return profiles.filter((p) => p.class_time === scope);
    return profiles.filter((p) => p.id === scope);
  }, [profiles, scope]);

  const save = useMutation({
    mutationFn: async () => {
      if (targets.length === 0) throw new Error("Nenhum aluno selecionado.");
      if (days.length === 0) throw new Error("Escolha pelo menos um dia da semana.");
      const rows = targets.map((t) => ({
        user_id: t.id,
        notify_practice: enabled,
        practice_reminder_hour: hour,
        practice_reminder_days: days.slice().sort(),
      }));
      const { error } = await supabase
        .from("notification_prefs")
        .upsert(rows, { onConflict: "user_id" });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`Lembrete aplicado para ${count} aluno(s).`);
      queryClient.invalidateQueries({ queryKey: ["admin-notification-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-primary" /> Lembrete geral do diário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Aplicar para</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os alunos</SelectItem>
                <SelectItem value="13:00">Turma 13h</SelectItem>
                <SelectItem value="14:30">Turma 14h30</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? "Aluno sem nome"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {targets.length} aluno(s) serão atualizados.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Lembrete ativado</p>
              <p className="text-xs text-muted-foreground">
                Avisa quem ainda não registrou no dia.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Horário</Label>
            <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {practiceHourOptions.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frequência</Label>
            <WeekdayPicker days={days} onChange={setDays} />
          </div>

          <Button
            className="w-full gap-2"
            disabled={save.isPending || targets.length === 0}
            onClick={() => save.mutate()}
          >
            <Save className="h-4 w-4" /> Salvar lembrete
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração atual dos alunos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loadingProfiles || prefsQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno cadastrado ainda.</p>
          ) : (
            profiles.map((p) => {
              const pref = prefsById[p.id];
              const active = pref?.notify_practice ?? defaultPrefs.notify_practice;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{p.full_name ?? "Aluno sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.class_time ? `Turma ${p.class_time}` : "Sem turma"} ·{" "}
                      {hourLabel(
                        pref?.practice_reminder_hour ?? defaultPrefs.practice_reminder_hour,
                      )}{" "}
                      · {daysLabel(pref?.practice_reminder_days)}
                    </p>
                  </div>
                  <Badge variant={active ? "default" : "secondary"}>
                    {active ? "Ativo" : "Desativado"}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
