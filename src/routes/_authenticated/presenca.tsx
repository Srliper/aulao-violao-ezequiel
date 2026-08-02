import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/presenca")({
  head: () => ({
    meta: [
      { title: "Presenças · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Histórico das suas presenças nas aulas de violão." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PresencaPage,
});

function PresencaPage() {
  const { user } = Route.useRouteContext();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["attendance", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .order("class_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CalendarCheck2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Minhas Presenças</h1>
          <p className="text-sm text-muted-foreground">Histórico das aulas registradas pelo professor.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !rows || rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há presenças registradas. Elas aparecem aqui depois que o professor faz a chamada.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">
                    {new Date(r.class_date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}