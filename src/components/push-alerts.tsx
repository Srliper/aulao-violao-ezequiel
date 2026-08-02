import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertKind, registerDevice, shouldAlert, unregisterDevice } from "@/lib/push-devices";

type PermissionState = "unsupported" | "default" | "granted" | "denied";

function currentPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as PermissionState;
}

/**
 * Alertas de mensagens: mostra toast dentro do app e notificação do
 * navegador (push local) quando o professor — ou um aluno — responde no chat.
 */
export function PushAlerts() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>("default");
  const [busy, setBusy] = useState(false);
  const [, setEnabled] = useState(false);
  const namesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setPermission(currentPermission());
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // mantém o registro deste aparelho atualizado quando os alertas já estão ativos
  useEffect(() => {
    if (!userId || permission !== "granted") return;
    void registerDevice(userId)
      .then(() => setEnabled(true))
      .catch(() => undefined);
  }, [userId, permission]);

  useEffect(() => {
    if (!userId) return;

    async function senderName(id: string) {
      if (namesRef.current[id]) return namesRef.current[id];
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", id)
        .maybeSingle();
      const name = data?.full_name ?? "Nova mensagem";
      namesRef.current[id] = name;
      return name;
    }

    async function notify(title: string, body: string, link: string, kind: AlertKind) {
      const allowed = await shouldAlert(userId!, kind).catch(() => true);
      if (!allowed) return;
      toast(title, {
        description: body,
        action: { label: "Abrir", onClick: () => router.navigate({ to: link }) },
      });
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          const n = new Notification(title, { body, icon: "/favicon.ico", tag: link });
          n.onclick = () => {
            window.focus();
            router.navigate({ to: link });
            n.close();
          };
        } catch {
          /* alguns navegadores exigem service worker; o toast já cobre */
        }
      }
    }

    const channel = supabase
      .channel(`alerts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { sender_id: string; content: string };
          void senderName(row.sender_id).then((name) => {
            void notify(`${name} respondeu`, row.content?.slice(0, 140) ?? "", "/mensagens", "messages");
          });
          queryClient.invalidateQueries({ queryKey: ["dm-inbox", userId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { title: string; body: string | null; link: string | null };
          const link = row.link ?? "/dashboard";
          const kind: AlertKind =
            /aula|chamada|presen|agenda/i.test(`${row.title} ${link}`) ? "classes" : "mentions";
          void notify(row.title, row.body ?? "", link, kind);
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, router]);

  if (!userId || permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <BellRing className="h-3.5 w-3.5 text-primary" /> Alertas ativos
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await unregisterDevice(userId).catch(() => undefined);
            setBusy(false);
            setEnabled(false);
            setPermission("default");
            toast.success("Alertas desativados neste aparelho.");
          }}
        >
          <BellOff className="h-3.5 w-3.5" /> Desativar aqui
        </Button>
      </span>
    );
  }

  if (permission === "denied") {
    return (
      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
        <BellOff className="h-3.5 w-3.5" /> Alertas bloqueados
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await Notification.requestPermission();
        setPermission(result as PermissionState);
        if (result === "granted") {
          await registerDevice(userId).catch(() => undefined);
          setEnabled(true);
          toast.success("Alertas ativados neste aparelho! Você será avisado quando o professor responder.");
        }
        if (result === "denied") toast.error("Alertas bloqueados nas configurações do navegador.");
        setBusy(false);
      }}
    >
      <Bell className="h-4 w-4" /> Ativar alertas
    </Button>

  );
}
