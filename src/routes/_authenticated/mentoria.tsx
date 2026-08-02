import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/mentoria")({
  head: () => ({
    meta: [
      { title: "Mentoria · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Mentoria entre alunos: alunos avançados orientam iniciantes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentoriaPage,
});

function MentoriaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mentoria entre Alunos</h1>
          <p className="text-sm text-muted-foreground">Alunos Sênior e Mestre orientam iniciantes em sessões dedicadas.</p>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Em breve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O sistema de mentoria está sendo preparado. Em breve você poderá solicitar um mentor
            ou se voluntariar para orientar novos alunos.
          </p>
          <Button variant="outline" asChild>
            <a href="https://wa.me/5514998695865" target="_blank" rel="noreferrer">
              Falar com o professor
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}