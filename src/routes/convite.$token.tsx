import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { GraduationCap, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getInvite, acceptInvite } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/convite/$token")({
  head: () => ({
    meta: [
      { title: "Convite do professor · Escola de Violão Ezequiel Pereira" },
      {
        name: "description",
        content: "Crie seu acesso de aluno na Escola de Violão Ezequiel Pereira com o convite do professor.",
      },
      { property: "og:title", content: "Convite do professor · Escola de Violão" },
      { property: "og:description", content: "Crie seu acesso de aluno com o convite do professor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params }) => getInvite({ data: { token: params.token } }),
  errorComponent: () => (
    <Shell title="Não foi possível abrir o convite">
      <p className="text-sm text-muted-foreground">Tente novamente ou peça um novo link ao professor.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell title="Convite não encontrado">
      <p className="text-sm text-muted-foreground">Peça um novo link ao professor.</p>
    </Shell>
  ),
  component: ConvitePage;
});

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </div>
  );
}

function ConvitePage() {
  const invite = Route.useLoaderData();
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const accept = useServerFn(acceptInvite);
  const [email, setEmail] = useState(invite.status === "ok" ? (invite.email ?? "") : "");
  const [password, setPassword] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      await accept({ data: { token, email: email.trim(), password } });
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error("Conta criada! Faça login com seu e-mail e senha.");
    },
    onSuccess: () => {
      toast.success("Acesso criado, bem-vindo(a) 🎸");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o acesso."),
  });

  if (invite.status !== "ok") {
    const msg =
      invite.status === "used"
        ? "Este convite já foi usado. Faça login com o e-mail e a senha que você cadastrou."
        : invite.status === "expired"
          ? "Este convite expirou. Peça um novo link ao professor."
          : "Convite inválido. Peça um novo link ao professor.";
    return (
      <Shell title="Convite indisponível">
        <p className="text-sm text-muted-foreground">{msg}</p>
        <Button asChild className="w-full">
          <Link to="/auth">Ir para o login</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title={`Olá, ${invite.full_name}!`}>
      <p className="text-sm text-muted-foreground">
        Você foi convidado(a) para a turma de <strong>sábado {invite.class_time}</strong>. Escolha seu e-mail e uma
        senha para criar seu acesso.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (password.length < 6) {
            toast.error("A senha precisa ter pelo menos 6 caracteres.");
            return;
          }
          criar.mutate();
        }}
      >
        <div>
          <Label htmlFor="email">Seu e-mail</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="senha">Crie uma senha</Label>
          <Input
            id="senha"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="submit" className="w-full gap-2" disabled={criar.isPending}>
          <KeyRound className="h-4 w-4" />
          {criar.isPending ? "Criando…" : "Criar meu acesso"}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Já tem conta? <Link to="/auth" className="underline">Entrar</Link>
      </p>
    </Shell>
  );
}
