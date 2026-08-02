import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, link, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<Notification[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const unread = (items ?? []).filter((n) => !n.read_at).length;

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-4 w-4 text-primary" />
          Avisos
          {unread > 0 && <Badge variant="secondary">{unread} novo(s)</Badge>}
        </CardTitle>
        {unread > 0 && (
          <Button variant="ghost" size="sm" className="gap-1" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Marcar lidos
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !items || items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {n.link === "/presenca" && (
                        <>
                          {" · "}
                          <Link to="/presenca" className="font-medium text-primary hover:underline">
                            ver chamada
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
