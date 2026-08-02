import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Acesse sua jornada musical: entre ou crie sua conta na Escola de Violão Ezequiel Pereira." },
      { property: "og:title", content: "Entrar · Escola de Violão Ezequiel Pereira" },
      { property: "og:description", content: "Acesse sua jornada musical na Escola de Violão Ezequiel Pereira." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, "Informe seu nome completo"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  classTime: z.enum(["13:00", "14:30"], { message: "Escolha uma turma" }),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "", classTime: "13:00" },
  });

  async function onSignIn(values: SignInValues) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error("Falha no login", { description: error.message });
      return;
    }
    toast.success("Bem-vindo de volta! 🎸");
    await router.invalidate();
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSignUp(values: SignUpValues) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: values.fullName,
          phone: values.phone || null,
          class_time: values.classTime,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível criar sua conta", { description: error.message });
      return;
    }
    toast.success("Conta criada! Verifique seu email para confirmar.");
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Falha ao entrar com Google", { description: result.error.message });
      return;
    }
    if (result.redirected) return;
    await router.invalidate();
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "var(--gradient-warm)" }} />
      <Card className="relative z-10 w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-3xl">🎸</div>
          <CardTitle className="text-2xl">Sua jornada musical</CardTitle>
          <CardDescription>Entre ou crie sua conta para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handleGoogle}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.6 14.7 2.6 12 2.6 6.8 2.6 2.6 6.8 2.6 12s4.2 9.4 9.4 9.4c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z" />
            </svg>
            Continuar com Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            ou
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" autoComplete="email" {...signInForm.register("email")} />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input id="signin-password" type="password" autoComplete="current-password" {...signInForm.register("password")} />
                  {signInForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
                <div className="text-center text-xs">
                  <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                    Esqueci minha senha
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <Input id="signup-name" autoComplete="name" {...signUpForm.register("fullName")} />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">WhatsApp (opcional)</Label>
                  <Input id="signup-phone" autoComplete="tel" placeholder="(14) 99999-9999" {...signUpForm.register("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" autoComplete="email" {...signUpForm.register("email")} />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" type="password" autoComplete="new-password" {...signUpForm.register("password")} />
                  {signUpForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Turma preferida (sábado)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["13:00", "14:30"] as const).map((t) => (
                      <label
                        key={t}
                        className="flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                      >
                        <input
                          type="radio"
                          value={t}
                          className="sr-only"
                          {...signUpForm.register("classTime")}
                        />
                        {t === "13:00" ? "13h · Iniciantes" : "14h30 · Adultos/Avançado"}
                      </label>
                    ))}
                  </div>
                  {signUpForm.formState.errors.classTime && (
                    <p className="text-xs text-destructive">{signUpForm.formState.errors.classTime.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
