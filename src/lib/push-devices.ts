import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "violao.device-id";
const ENDPOINT_KEY = "violao.push-endpoint";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Dispositivo";
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/i.test(ua)
    ? "iPhone/iPad"
    : /Android/i.test(ua)
      ? "Android"
      : /Mac OS X/i.test(ua)
        ? "Mac"
        : /Windows/i.test(ua)
          ? "Windows"
          : "Outro";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /Chrome\//i.test(ua)
      ? "Chrome"
      : /Firefox\//i.test(ua)
        ? "Firefox"
        : /Safari\//i.test(ua)
          ? "Safari"
          : "Navegador";
  return `${browser} · ${os}`;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Subscription = { endpoint: string; p256dh: string | null; auth: string | null };

/** Tenta criar uma inscrição real de push; se o navegador não suportar,
 *  usa um identificador local do aparelho (alertas em primeiro plano). */
async function buildSubscription(): Promise<Subscription> {
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && vapid) {
    try {
      const reg = await navigator.serviceWorker.register("/sw-push.js");
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        }));
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      return {
        endpoint: json.endpoint ?? `local:${getDeviceId()}`,
        p256dh: json.keys?.p256dh ?? null,
        auth: json.keys?.auth ?? null,
      };
    } catch {
      /* segue para o modo local */
    }
  }
  return { endpoint: `local:${getDeviceId()}`, p256dh: null, auth: null };
}

/** Registra/atualiza este aparelho para o usuário (um registro por dispositivo). */
export async function registerDevice(userId: string) {
  const sub = await buildSubscription();
  window.localStorage.setItem(ENDPOINT_KEY, sub.endpoint);

  // remove registros antigos deste mesmo aparelho (endpoint trocado pelo navegador)
  await supabase
    .from("push_devices")
    .delete()
    .eq("user_id", userId)
    .eq("device_label", deviceLabel())
    .neq("endpoint", sub.endpoint);

  const { error } = await supabase.from("push_devices").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      device_label: deviceLabel(),
      user_agent: navigator.userAgent.slice(0, 400),
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) console.error("push_devices upsert", error);
  return sub.endpoint;
}

/** Remove este aparelho (ao desativar alertas ou sair da conta). */
export async function unregisterDevice(userId?: string) {
  const endpoint = window.localStorage.getItem(ENDPOINT_KEY) ?? `local:${getDeviceId()}`;

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
    } catch {
      /* ignora */
    }
  }

  let query = supabase.from("push_devices").delete().eq("endpoint", endpoint);
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) console.error("push_devices delete", error);
  window.localStorage.removeItem(ENDPOINT_KEY);
}

/** Lista os aparelhos do usuário. */
export async function listDevices(userId: string) {
  const { data, error } = await supabase
    .from("push_devices")
    .select(
      "id, endpoint, device_label, enabled, last_seen_at, created_at, notify_messages, notify_classes, notify_mentions, notify_practice, class_reminder_minutes",
    )
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}


/** Remove um aparelho específico pela lista. */
export async function removeDevice(id: string) {
  const { error } = await supabase.from("push_devices").delete().eq("id", id);
  if (error) throw error;
}

export function currentEndpoint() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ENDPOINT_KEY);
}

/* ---------------- Preferências de alertas ---------------- */

export type AlertKind = "messages" | "classes" | "mentions" | "practice";

export type AlertPrefs = {
  notify_messages: boolean;
  notify_classes: boolean;
  notify_mentions: boolean;
  notify_practice: boolean;
  practice_reminder_hour: number;
  practice_reminder_days: number[];
  class_reminder_minutes: number;
};

/** Opções de antecedência para os lembretes de aula. */
export const reminderOptions = [
  { value: 10, label: "10 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 180, label: "3 horas antes" },
  { value: 1440, label: "1 dia antes" },
  { value: 2880, label: "2 dias antes" },
] as const;

export function reminderLabel(minutes: number | null | undefined) {
  if (minutes == null) return "Seguir a conta";
  return reminderOptions.find((o) => o.value === minutes)?.label ?? `${minutes} min antes`;
}

/** Dias da semana (0 = domingo) usados nas preferências de prática. */
export const weekdayOptions = [
  { value: 0, short: "Dom" },
  { value: 1, short: "Seg" },
  { value: 2, short: "Ter" },
  { value: 3, short: "Qua" },
  { value: 4, short: "Qui" },
  { value: 5, short: "Sex" },
  { value: 6, short: "Sáb" },
] as const;

/** Presets de frequência do lembrete de prática. */
export const practiceFrequencies = [
  { id: "daily", label: "Todos os dias", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "weekdays", label: "Dias de semana (Seg–Sex)", days: [1, 2, 3, 4, 5] },
  { id: "weekend", label: "Fins de semana (Sáb e Dom)", days: [0, 6] },
  { id: "custom", label: "Personalizado", days: [] },
] as const;

export function practiceFrequencyId(days: number[]) {
  const key = [...days].sort().join(",");
  const match = practiceFrequencies.find(
    (f) => f.id !== "custom" && [...f.days].sort().join(",") === key,
  );
  return match?.id ?? "custom";
}

export const practiceHourOptions = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, "0")}:00`,
}));

export const defaultPrefs: AlertPrefs = {
  notify_messages: true,
  notify_classes: true,
  notify_mentions: true,
  notify_practice: true,
  practice_reminder_hour: 19,
  practice_reminder_days: [0, 1, 2, 3, 4, 5, 6],
  class_reminder_minutes: 60,
};

export const prefColumn: Record<
  AlertKind,
  "notify_messages" | "notify_classes" | "notify_mentions" | "notify_practice"
> = {
  messages: "notify_messages",
  classes: "notify_classes",
  mentions: "notify_mentions",
  practice: "notify_practice",
};

/** Preferências da conta inteira (valem para todos os aparelhos). */
export async function getAccountPrefs(userId: string): Promise<AlertPrefs> {
  const { data, error } = await supabase
    .from("notification_prefs")
    .select(
      "notify_messages, notify_classes, notify_mentions, notify_practice, practice_reminder_hour, practice_reminder_days, class_reminder_minutes",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return defaultPrefs;
  return {
    ...defaultPrefs,
    ...data,
    practice_reminder_days: data.practice_reminder_days ?? defaultPrefs.practice_reminder_days,
  };
}

export async function saveAccountPrefs(userId: string, prefs: AlertPrefs) {
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
  if (error) throw error;
}

/** Antecedência efetiva (em minutos) do lembrete de aula neste aparelho. */
export async function getReminderLeadMinutes(userId: string): Promise<number> {
  let accountMinutes = defaultPrefs.class_reminder_minutes;
  try {
    accountMinutes = (await getAccountPrefs(userId)).class_reminder_minutes ?? accountMinutes;
  } catch {
    /* usa o padrão */
  }
  const endpoint = currentEndpoint();
  if (!endpoint) return accountMinutes;
  const { data } = await supabase
    .from("push_devices")
    .select("class_reminder_minutes")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  return data?.class_reminder_minutes ?? accountMinutes;
}

/** Atualiza preferências/estado de um aparelho específico. */
export async function updateDevice(
  id: string,
  patch: Partial<
    Omit<AlertPrefs, "class_reminder_minutes" | "practice_reminder_hour" | "practice_reminder_days">
  > & {
    enabled?: boolean;
    device_label?: string;
    class_reminder_minutes?: number | null;
  },

) {
  const { error } = await supabase.from("push_devices").update(patch).eq("id", id);
  if (error) throw error;
}


/** Decide se um alerta deve ser exibido neste aparelho. */
export async function shouldAlert(userId: string, kind: AlertKind): Promise<boolean> {
  const col = prefColumn[kind];
  try {
    const account = await getAccountPrefs(userId);
    if (!account[col]) return false;
  } catch {
    /* sem preferências salvas: segue o padrão (tudo ligado) */
  }
  const endpoint = currentEndpoint();
  if (!endpoint) return true;
  const { data } = await supabase
    .from("push_devices")
    .select("enabled, notify_messages, notify_classes, notify_mentions, notify_practice")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (!data) return true;
  return data.enabled !== false && data[col] !== false;
}

/* ---------------- Próxima aula, fuso horário e lembretes ---------------- */

/** Fuso oficial da escola: as aulas são marcadas neste fuso (com horário de verão automático). */
export const SCHOOL_TIME_ZONE = "America/Sao_Paulo";

/** Fuso do aparelho atual (ex.: "America/Sao_Paulo", "Europe/Lisbon"). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SCHOOL_TIME_ZONE;
  } catch {
    return SCHOOL_TIME_ZONE;
  }
}

/** Diferença (ms) entre o fuso informado e o UTC no instante indicado — considera horário de verão. */
function zoneOffsetMs(timeZone: string, instant: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(instant).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** Converte "2026-08-01" + "14:30" no fuso da escola para o instante real (Date em UTC). */
export function zonedToInstant(isoDate: string, time: string, timeZone = SCHOOL_TIME_ZONE) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const naive = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  // duas passadas resolvem as viradas de horário de verão
  let ts = naive - zoneOffsetMs(timeZone, new Date(naive));
  ts = naive - zoneOffsetMs(timeZone, new Date(ts));
  return new Date(ts);
}

/** Data (YYYY-MM-DD) de "hoje" no fuso informado. */
export function todayInZone(timeZone = SCHOOL_TIME_ZONE) {
  const now = new Date();
  return new Date(now.getTime() + zoneOffsetMs(timeZone, now)).toISOString().slice(0, 10);
}

/** Dia da semana (0=dom … 6=sáb) de uma data ISO, sem depender do fuso do aparelho. */
function isoWeekday(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDaysIso(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Próxima aula do aluno (agenda do professor + horário da turma no perfil), como instante real. */
export async function getNextClass(
  userId: string,
): Promise<{ start: Date; classTime: string; note: string | null } | null> {
  const todayIso = todayInZone();

  const { data: profile } = await supabase
    .from("profiles")
    .select("class_time")
    .eq("id", userId)
    .maybeSingle();
  const myTime = profile?.class_time ?? null;

  const { data: rows } = await supabase
    .from("class_schedule")
    .select("class_date, class_time, will_happen, note")
    .gte("class_date", todayIso)
    .order("class_date");

  const now = Date.now();
  const scheduled = (rows ?? [])
    .filter((r) => r.will_happen && (!myTime || r.class_time === myTime))
    .map((r) => ({
      start: zonedToInstant(r.class_date, r.class_time),
      classTime: r.class_time,
      note: r.note,
    }))
    .filter((r) => r.start.getTime() > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (scheduled.length > 0) return scheduled[0];

  // fallback: próximo sábado no horário da turma (sempre no fuso da escola)
  const time = myTime ?? "14:30";
  let iso = todayIso;
  for (let i = 0; i < 14; i++) {
    if (isoWeekday(iso) === 6) {
      const start = zonedToInstant(iso, time);
      if (start.getTime() > now) return { start, classTime: time, note: null };
    }
    iso = addDaysIso(iso, 1);
  }
  return null;
}

/** Data/hora em que o lembrete será disparado, dado o adiantamento em minutos. */
export function reminderAt(classStart: Date, leadMinutes: number) {
  return new Date(classStart.getTime() - leadMinutes * 60000);
}

/** Formata um instante no fuso escolhido (padrão: fuso do aparelho). */
export function formatDateTime(date: Date, timeZone: string = deviceTimeZone()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

/** Sigla do fuso (ex.: "GMT-3") para deixar claro em qual horário o lembrete cai. */
export function timeZoneLabel(date: Date, timeZone: string = deviceTimeZone()) {
  try {
    const parts = new Intl.DateTimeFormat("pt-BR", { timeZone, timeZoneName: "shortOffset" }).formatToParts(
      date,
    );
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

/** Verdadeiro quando o aparelho está em fuso diferente do da escola. */
export function isForeignTimeZone(timeZone: string = deviceTimeZone()) {
  return timeZone !== SCHOOL_TIME_ZONE;
}

