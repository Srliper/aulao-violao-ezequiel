import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, UserPlus, Link2, Copy, MessageCircle, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { createInvite, createStudentAccount } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Turma = "13:00" | "14:30";

export const Route = createFileRoute("/_authenticated/convites")({
  head: () => ({
    meta: [
      { title: "Convidar alunos · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Crie o acesso dos alunos e envie o link ou a senha pelo WhatsApp." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const user = (context as { user?: { id: string } }).user;
    if (!user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw redirect({ to: "/dashboard" });
  },
  component: ConvitesPage,
});

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function waLink(phone: string, message: string) {
  const digits = onlyDigits(phone);
  const e164 = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

function ConvitesPage() {
  const queryClient = useQueryClient();
  const novoConvite = useServerFn(createInvite);
  const novaConta = useServerFn(createStudentAccount);

  const [nome, setNome] = useState("");
  const [fone, setFone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [turma, setTurma] = useState<Turma>("14:30");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const { data: invites } = useQuery({
    queryKey: ["student-invites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_invites")
        .select("id, token, full_name, phone, class_time, used_at, expires_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const gerarLink = useMutation({
    mutationFn: async () =>
      novoConvite({ data: { full_name: nome.trim(), phone: fone.trim(), email: email.trim(), class_time: turma } }),
    onSuccess: ({ token }) => {
      const url = `${origin}/convite/${token}`;
      void navigator.clipboard?.writeText(url);
      toast.success("Link criado e copiado 🎸");
      setNome("");
      setFone("");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["student-invites"] });
      return url;
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o convite."),
  });

  const criarConta = useMutation({
    mutationFn: async () =>
      novaConta({
        data: {
          full_name: nome.trim(),
          phone: fone.trim(),
          email: email.trim(),
          password: senha,
          class_time: turma,
        },
      }),
    onSuccess: () => {
      toast.success("Conta do aluno criada 🎸 Agora envie os dados no WhatsApp.");
      queryClient.invalidateQueries({ queryKey: ["chamada-people"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar a conta."),
  });

  const mensagemConta = useMemo(
    () =>
      `Olá ${nome || "aluno"}! Seu acesso ao app da Escola de Violão Ezequiel Pereira está pronto 🎸\n\n` +
      `Site: ${origin}/auth\nE-mail: ${email}\nSenha: ${senha}\n\nTurma: sábado ${turma}. Recomendo trocar a senha depois de entrar.`,
    [nome, email, senha, turma, origin],
  );

  const removerConvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite removido.");
      queryClient.invalidateQueries({ queryKey: ["student-invites"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível remover."),
  });

  const dadosBase = nome.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/admin" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao painel
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserPlus className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convidar alunos</h1>
          <p className="text-sm text-muted-foreground">
            Gere um link para o aluno criar o próprio acesso, ou já defina e-mail e senha. Depois envie pelo WhatsApp.
          </p>
        </div>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Dados do aluno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="nome">Nome do aluno</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Leonice Silva" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="fone">WhatsApp (com DDD)</Label>
              <Input id="fone" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="Ex.: 41 99999-0000" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Turma</Label>
            <Tabs value={turma} onValueChange={(v) => setTurma(v as Turma)} className="mt-1">
              <TabsList>
                <TabsTrigger value="13:00">Sábado 13h</TabsTrigger>
                <TabsTrigger value="14:30">Sábado 14h30</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Tabs defaultValue="link" className="pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1">Link de cadastro</TabsTrigger>
              <TabsTrigger value="senha" className="flex-1">E-mail e senha</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-3 pt-4">
              <div>
                <Label htmlFor="email-op">E-mail do aluno (opcional)</Label>
                <Input
                  id="email-op"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Deixe em branco para o aluno escolher"
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full gap-2"
                disabled={!dadosBase || gerarLink.isPending}
                onClick={() => gerarLink.mutate()}
              >
                <Link2 className="h-4 w-4" />
                {gerarLink.isPending ? "Gerando…" : "Gerar link de cadastro"}
              </Button>
              <p className="text-xs text-muted-foreground">
                O aluno abre o link, escolhe e-mail e senha e já entra na turma certa. O link vale 30 dias.
              </p>
            </TabsContent>

            <TabsContent value="senha" className="space-y-3 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email-req">E-mail do aluno</Label>
                  <Input id="email-req" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="senha-req">Senha inicial</Label>
                  <Input id="senha-req" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 6 caracteres" className="mt-1" />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 gap-2"
                  disabled={!dadosBase || senha.length < 6 || !email.includes("@") || criarConta.isPending}
                  onClick={() => criarConta.mutate()}
                >
                  <KeyRound className="h-4 w-4" />
                  {criarConta.isPending ? "Criando…" : "Criar conta do aluno"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  disabled={!fone.trim() || !email.includes("@") || senha.length < 6}
                  asChild
                >
                  <a href={waLink(fone, mensagemConta)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A conta já entra confirmada. A mensagem do WhatsApp leva o site, o e-mail e a senha.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Convites gerados ({invites?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!invites || invites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum convite ainda.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {invites.map((i) => {
                const url = `${origin}/convite/${i.token}`;
                const msg =
                  `Olá ${i.full_name}! Aqui está seu convite para o app da Escola de Violão Ezequiel Pereira 🎸\n\n` +
                  `${url}\n\nÉ só abrir o link e criar seu e-mail e senha. Turma: sábado ${i.class_time}.`;
                return (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Sábado {i.class_time} · {i.used_at ? "já usado" : "aguardando cadastro"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={i.used_at ? "secondary" : "default"}>{i.used_at ? "Ativo" : "Pendente"}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        aria-label="Copiar link"
                        onClick={() => {
                          void navigator.clipboard?.writeText(url);
                          toast.success("Link copiado.");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {i.phone && !i.used_at && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" asChild aria-label="Enviar no WhatsApp">
                          <a href={waLink(i.phone, msg)} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Remover convite"
                        onClick={() => removerConvite.mutate(i.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
