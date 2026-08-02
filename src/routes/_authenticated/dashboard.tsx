import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unregisterDevice } from "@/lib/push-devices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { NotificationsCard } from "@/components/notifications-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu Painel · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Acompanhe sua jornada musical, presenças e patente." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, ranks(*)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function handleSignOut() {
    await unregisterDevice(user.id).catch(() => undefined);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Até a próxima aula! 🎸");
    navigate({ to: "/auth", replace: true });
  }

  const displayName = profile?.full_name || user.email;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo(a),</p>
          <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
        </div>
        <Button variant="outline" onClick={handleSignOut}>Sair</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Sua patente</CardDescription>
            <CardTitle className="text-2xl">🎖️ Iniciado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Continue estudando e presença nas aulas para subir de nível.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Próxima aula</CardDescription>
            <CardTitle className="text-2xl">Sábado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              13h · Iniciantes/Crianças &nbsp;·&nbsp; 14h30 · Adultos/Avançado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <NotificationsCard userId={user.id} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { to: "/tarefas", title: "Tarefas da aula", desc: "Deveres de casa e prazos" },
          { to: "/pratica", title: "Diário de prática", desc: "Registre seus minutos" },
          { to: "/certificado", title: "Certificado", desc: "Baixe sua patente em PDF" },
        ].map((s) => (
          <Card key={s.to} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{s.title}</CardTitle>
              <CardDescription>{s.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to={s.to}>Abrir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
