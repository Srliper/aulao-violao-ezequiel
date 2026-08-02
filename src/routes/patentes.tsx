import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/patentes")({
  head: () => ({
    meta: [
      { title: "Patentes · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Conheça o sistema de patentes da Escola de Violão Ezequiel Pereira: do Iniciado ao Mestre." },
      { property: "og:title", content: "Sistema de Patentes · Escola de Violão" },
      { property: "og:description", content: "Evolua no violão do Iniciado ao Mestre com metas claras em cada etapa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatentesPage,
});

const ranks = [
  { emoji: "🌱", name: "Iniciado", desc: "Acordes básicos e afinação. Postura, ritmo simples e primeiras músicas." },
  { emoji: "🎵", name: "Amador", desc: "Menores, dedilhado PIMA e leitura de cifras completas." },
  { emoji: "⭐", name: "Aspirante", desc: "Pentatônica, acordes com 7ª e primeiros solos." },
  { emoji: "🔥", name: "Sênior", desc: "Hammer-on, slide, harmonia funcional e improviso." },
  { emoji: "👑", name: "Mestre", desc: "Domínio técnico, repertório amplo e capacidade de ensinar." },
];

function PatentesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">Gamificação</span>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Sistema de Patentes</h1>
        <p className="mt-3 text-muted-foreground">Cada patente representa uma nova conquista na sua jornada musical.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {ranks.map((r) => (
          <Card key={r.name} className="border-border/60">
            <CardContent className="flex gap-4 p-5">
              <div className="text-4xl">{r.emoji}</div>
              <div>
                <h2 className="text-lg font-bold">{r.name}</h2>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button asChild size="lg" className="rounded-full">
          <Link to="/auth">Começar minha jornada</Link>
        </Button>
      </div>
    </div>
  );
}