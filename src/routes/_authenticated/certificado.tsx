import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateCertificatePDF } from "@/lib/certificate";
import { toast } from "sonner";
import { Award, Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/certificado")({
  head: () => ({
    meta: [
      { title: "Certificado Digital · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content: "Baixe seu certificado digital de patente assinado pelo professor Ezequiel Pereira.",
      },
      { property: "og:title", content: "Certificado Digital · Escola de Violão" },
      { property: "og:description", content: "Prestígio para a sua conquista: certificado de patente em PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificadoPage,
});

function CertificadoPage() {
  const { user } = Route.useRouteContext();

  const { data, isLoading } = useQuery({
    queryKey: ["certificate-data", user.id],
    queryFn: async () => {
      const [{ data: profile, error }, attendance, practice] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, started_at, class_time, rank_id, ranks(name, icon)")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["present", "late"]),
        supabase.from("practice_logs").select("minutes").eq("user_id", user.id),
      ]);
      if (error) throw error;
      const minutes = (practice.data ?? []).reduce((s, r) => s + (r.minutes ?? 0), 0);
      return {
        profile,
        attendanceCount: attendance.count ?? 0,
        practiceMinutes: minutes,
      };
    },
  });

  const rank = data?.profile?.ranks as { name: string; icon: string } | null | undefined;
  const name = data?.profile?.full_name || user.email || "Aluno";
  const eligible = !!rank;

  function handleDownload() {
    if (!rank) return;
    generateCertificatePDF({
      studentName: name,
      rankName: rank.name,
      rankIcon: rank.icon,
      startedAt: data?.profile?.started_at ?? null,
      classTime: data?.profile?.class_time ?? null,
      attendanceCount: data?.attendanceCount,
      practiceMinutes: data?.practiceMinutes,
    });
    toast.success("Certificado gerado! 🎓");
  }

  const fmtH = (m: number) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificado Digital</h1>
          <p className="text-sm text-muted-foreground">
            Sua conquista em PDF, assinada pela escola.
          </p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <Card className="overflow-hidden">
          <div
            className="border-b border-border/60 p-8 text-center"
            style={{ background: "var(--gradient-hero)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              Escola de Violão Ezequiel Pereira
            </p>
            <p className="mt-3 text-2xl font-bold text-primary-foreground">{name}</p>
            <p className="mt-2 text-4xl">{rank?.icon ?? "🎸"}</p>
            <p className="mt-1 text-lg font-semibold text-primary-foreground">
              {rank ? `Patente de ${rank.name}` : "Patente ainda não concedida"}
            </p>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Dados do certificado</CardTitle>
            <CardDescription>
              As informações abaixo entram automaticamente no PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {data?.profile?.started_at && (
                <li className="flex justify-between gap-3 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Início dos estudos</span>
                  <span className="font-medium">
                    {new Date(`${data.profile.started_at}T12:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              )}
              {data?.profile?.class_time && (
                <li className="flex justify-between gap-3 border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Turma</span>
                  <span className="font-medium">Sábado {data.profile.class_time}</span>
                </li>
              )}
              <li className="flex justify-between gap-3 border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Aulas registradas</span>
                <span className="font-medium">{data?.attendanceCount ?? 0}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Prática registrada</span>
                <span className="font-medium">{fmtH(data?.practiceMinutes ?? 0)}</span>
              </li>
            </ul>

            <Button
              onClick={handleDownload}
              disabled={!eligible}
              size="lg"
              className="w-full rounded-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar certificado em PDF
            </Button>
            {!eligible && (
              <p className="text-xs text-muted-foreground">
                O certificado fica disponível quando o professor Ezequiel conceder sua primeira patente.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
