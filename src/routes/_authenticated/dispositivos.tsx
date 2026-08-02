import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Laptop, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertPrefs,
  currentEndpoint,
  defaultPrefs,
  getAccountPrefs,
  listDevices,
  removeDevice,
  reminderOptions,
  getNextClass,
  reminderAt,
  formatDateTime,
  deviceTimeZone,
  timeZoneLabel,
  isForeignTimeZone,
  SCHOOL_TIME_ZONE,
  saveAccountPrefs,
  updateDevice,
  weekdayOptions,
  practiceFrequencies,
  practiceFrequencyId,
  practiceHourOptions,
} from "@/lib/push-devices";


export const Route = createFileRoute("/_authenticated/dispositivos")({
  component: DispositivosPage,
  head: () => ({
    meta: [
      { title: "Meus dispositivos · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content:
          "Veja os aparelhos conectados à sua conta, o último uso e escolha quais alertas receber em cada um.",
      },
      { property: "og:title", content: "Meus dispositivos e alertas" },
      {
        property: "og:description",
        content: "Gerencie alertas de mensagens, aulas e menções por aparelho ou por conta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type BoolPref = "notify_messages" | "notify_classes" | "notify_mentions" | "notify_practice";

const kinds: { key: BoolPref; label: string; hint: string }[] = [
  { key: "notify_messages", label: "Novas respostas do professor", hint: "Mensagens diretas no chat" },
  { key: "notify_classes", label: "Lembretes de aula", hint: "Agenda, chamada e avisos de sábado" },
  { key: "notify_mentions", label: "Menções e outros avisos", hint: "Quando você é citado ou avisado" },
  {
    key: "notify_practice",
    label: "Lembrete diário de prática",
    hint: "Aviso para registrar o diário, no horário e nos dias que você escolher",
  },
];


function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function DispositivosPage() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [account, setAccount] = useState<AlertPrefs>(defaultPrefs);
  const thisEndpoint = typeof window !== "undefined" ? currentEndpoint() : null;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const devicesQuery = useQuery({
    queryKey: ["push-devices", userId],
    queryFn: () => listDevices(userId!),
    enabled: !!userId,
  });

  const prefsQuery = useQuery({
    queryKey: ["notification-prefs", userId],
    queryFn: () => getAccountPrefs(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (prefsQuery.data) setAccount(prefsQuery.data);
  }, [prefsQuery.data]);

  const saveAccount = useMutation({
    mutationFn: async (next: AlertPrefs) => saveAccountPrefs(userId!, next),
    onSuccess: () => {
      toast.success("Preferências da conta salvas.");
      queryClient.invalidateQueries({ queryKey: ["notification-prefs", userId] });
    },
    onError: () => toast.error("Não foi possível salvar agora."),
  });

  const patchDevice = useMutation({
    mutationFn: async (args: {
      id: string;
      patch: Partial<
        Omit<AlertPrefs, "class_reminder_minutes" | "practice_reminder_hour" | "practice_reminder_days">
      > & {
        enabled?: boolean;
        class_reminder_minutes?: number | null;
      };
    }) =>

      updateDevice(args.id, args.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["push-devices", userId] }),
    onError: () => toast.error("Não foi possível atualizar este aparelho."),
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => removeDevice(id),
    onSuccess: () => {
      toast.success("Aparelho removido.");
      queryClient.invalidateQueries({ queryKey: ["push-devices", userId] });
    },
  });

  const devices = devicesQuery.data ?? [];

  const nextClassQuery = useQuery({
    queryKey: ["next-class", userId],
    queryFn: () => getNextClass(userId!),
    enabled: !!userId,
  });
  const nextClass = nextClassQuery.data ?? null;
  const tz = deviceTimeZone();
  const tzLabel = nextClass ? timeZoneLabel(nextClass.start, tz) : "";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Meus dispositivos</h1>
        <p className="text-sm text-muted-foreground">
          Veja onde você está conectado e escolha quais alertas receber em cada aparelho.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-4 w-4 text-primary" /> Alertas da conta
          </CardTitle>
          <CardDescription>
            Estas opções valem para todos os aparelhos. Desligar aqui silencia o alerta em todo lugar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kinds.map((kind) => (
            <div key={kind.key} className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor={`acc-${kind.key}`} className="text-sm font-medium">
                  {kind.label}
                </Label>
                <p className="text-xs text-muted-foreground">{kind.hint}</p>
              </div>
              <Switch
                id={`acc-${kind.key}`}
                checked={account[kind.key]}
                onCheckedChange={(checked) => {
                  const next = { ...account, [kind.key]: checked };
                  setAccount(next);
                  saveAccount.mutate(next);
                }}
              />
            </div>
          ))}

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-medium">Antecedência do lembrete de aula</Label>
              <p className="text-xs text-muted-foreground">
                Com quanto tempo antes da aula você quer ser avisado.
              </p>
            </div>
            <Select
              value={String(account.class_reminder_minutes ?? 60)}
              disabled={!account.notify_classes}
              onValueChange={(value) => {
                const next = { ...account, class_reminder_minutes: Number(value) };
                setAccount(next);
                saveAccount.mutate(next);
              }}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Lembrete do diário de prática</Label>
              <p className="text-xs text-muted-foreground">
                Escolha a hora e os dias em que o aviso deve chegar (horário de Brasília). Ele só é enviado se
                você ainda não registrou a prática do dia.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={String(account.practice_reminder_hour ?? 19)}
                disabled={!account.notify_practice}
                onValueChange={(value) => {
                  const next = { ...account, practice_reminder_hour: Number(value) };
                  setAccount(next);
                  saveAccount.mutate(next);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {practiceHourOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={practiceFrequencyId(account.practice_reminder_days ?? [])}
                disabled={!account.notify_practice}
                onValueChange={(id) => {
                  const preset = practiceFrequencies.find((f) => f.id === id);
                  if (!preset || preset.id === "custom") return;
                  const next = { ...account, practice_reminder_days: [...preset.days] };
                  setAccount(next);
                  saveAccount.mutate(next);
                }}
              >
                <SelectTrigger className="w-[230px]">
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
            </div>

            <div className="flex flex-wrap gap-2">
              {weekdayOptions.map((day) => {
                const days = account.practice_reminder_days ?? [];
                const active = days.includes(day.value);
                return (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    disabled={!account.notify_practice}
                    onClick={() => {
                      const nextDays = active
                        ? days.filter((d) => d !== day.value)
                        : [...days, day.value].sort((a, b) => a - b);
                      if (nextDays.length === 0) {
                        toast.error("Escolha pelo menos um dia.");
                        return;
                      }
                      const next = { ...account, practice_reminder_days: nextDays };
                      setAccount(next);
                      saveAccount.mutate(next);
                    }}
                  >
                    {day.short}
                  </Button>
                );
              })}
            </div>
          </div>

          {nextClass && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Próxima aula:{" "}
                <span className="font-medium text-foreground">{formatDateTime(nextClass.start)}</span> · lembrete
                da conta em{" "}
                <span className="font-medium text-foreground">
                  {formatDateTime(reminderAt(nextClass.start, account.class_reminder_minutes ?? 60))}
                </span>{" "}
                ({tzLabel})
              </p>
              <p>
                Horários exibidos no fuso deste aparelho ({tz}).
                {isForeignTimeZone(tz) && (
                  <>
                    {" "}
                    A aula acontece às {formatDateTime(nextClass.start, SCHOOL_TIME_ZONE)} no horário da escola
                    (São Paulo).
                  </>
                )}
              </p>
            </div>
          )}
        </CardContent>

      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Aparelhos conectados</h2>

        {devicesQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {!devicesQuery.isLoading && devices.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum aparelho registrado ainda. Clique em “Ativar alertas” no topo da tela para registrar este
              dispositivo.
            </CardContent>
          </Card>
        )}

        {devices.map((device) => {
          const isCurrent = !!thisEndpoint && device.endpoint === thisEndpoint;
          const Icon = /iPhone|Android|iPad/i.test(device.device_label ?? "") ? Smartphone : Laptop;
          return (
            <Card key={device.id} className={isCurrent ? "border-primary/50" : undefined}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {device.device_label ?? "Dispositivo"}
                      {isCurrent && <Badge variant="secondary">Este aparelho</Badge>}
                    </CardTitle>
                    <CardDescription>Último uso: {formatDate(device.last_seen_at)}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={device.enabled}
                    onCheckedChange={(checked) =>
                      patchDevice.mutate({ id: device.id, patch: { enabled: checked } })
                    }
                    aria-label="Ativar alertas neste aparelho"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover aparelho"
                    onClick={() => deleteDevice.mutate(device.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Separator />
                {kinds.map((kind) => (
                  <div key={kind.key} className="flex items-center justify-between gap-4">
                    <Label htmlFor={`${device.id}-${kind.key}`} className="text-sm font-normal">
                      {kind.label}
                    </Label>
                    <Switch
                      id={`${device.id}-${kind.key}`}
                      disabled={!device.enabled || !account[kind.key]}
                      checked={device[kind.key] !== false && account[kind.key]}
                      onCheckedChange={(checked) =>
                        patchDevice.mutate({ id: device.id, patch: { [kind.key]: checked } })
                      }
                    />
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label className="text-sm font-normal">Antecedência do lembrete</Label>
                  <Select
                    value={
                      device.class_reminder_minutes == null
                        ? "account"
                        : String(device.class_reminder_minutes)
                    }
                    disabled={!device.enabled || !account.notify_classes || device.notify_classes === false}
                    onValueChange={(value) =>
                      patchDevice.mutate({
                        id: device.id,
                        patch: { class_reminder_minutes: value === "account" ? null : Number(value) },
                      })
                    }
                  >
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="account">Seguir a conta</SelectItem>
                      {reminderOptions.map((opt) => (
                        <SelectItem key={opt.value} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                  {!nextClass ? (
                    <span className="text-muted-foreground">Nenhuma aula futura na agenda.</span>
                  ) : !device.enabled || !account.notify_classes || device.notify_classes === false ? (
                    <span className="text-muted-foreground">
                      Lembretes de aula desativados neste aparelho.
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Próximo lembrete:{" "}
                      <span className="font-medium text-foreground">
                        {formatDateTime(
                          reminderAt(
                            nextClass.start,
                            device.class_reminder_minutes ?? account.class_reminder_minutes ?? 60,
                          ),
                        )}
                      </span>{" "}
                      · aula {formatDateTime(nextClass.start)}
                    </span>
                  )}
                </div>
              </CardContent>

            </Card>
          );
        })}
      </div>
    </div>
  );
}
