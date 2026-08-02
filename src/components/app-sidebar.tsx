import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Music2,
  Music4,
  Images,
  Trophy,
  Users,
  CalendarCheck2,
  Sparkles,
  MessageCircle,
  CalendarDays,
  LogIn,
  LogOut,
  Shield,
  Smartphone,
  MapPin,
  Phone,
  Timer,
  ClipboardList,
  Award,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import logoEscola from "@/assets/logo-escola.png";


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const primary = [
  { title: "Início", url: "/", icon: Home },
  { title: "Minhas Aulas", url: "/dashboard", icon: Music2 },
  { title: "Presença", url: "/presenca", icon: CalendarCheck2 },
  { title: "Tarefas", url: "/tarefas", icon: ClipboardList },
  { title: "Diário de Prática", url: "/pratica", icon: Timer },
  { title: "Agenda de Aulas", url: "/aulas", icon: CalendarDays },
  { title: "Mensagens", url: "/mensagens", icon: MessageCircle },
];

// visitante (rotas públicas)
const publicNav = [
  { title: "Início", url: "/", icon: Home },
  { title: "Patentes", url: "/patentes", icon: Trophy },
];

const publicLinks = [
  {
    title: "Falar no WhatsApp",
    icon: MessageCircle,
    href: `https://web.whatsapp.com/send?phone=5514998695865&text=${encodeURIComponent(
      "Olá Ezequiel! Vim pelo Portal Califórnia e quero saber mais sobre as aulas de violão.",
    )}`,
  },
  {
    title: "Como chegar",
    icon: MapPin,
    href: "https://www.google.com/maps/search/?api=1&query=Rua+Ver.+Jo%C3%A3o+Agostinho%2C+175+Portal+Calif%C3%B3rnia",
  },
  { title: "(14) 99869-5865", icon: Phone, href: "tel:+5514998695865" },
];

const growth = [
  { title: "Patentes", url: "/patentes", icon: Trophy },
  { title: "Certificado", url: "/certificado", icon: Award },
  { title: "Repertório", url: "/repertorio", icon: Music4 },
  { title: "Galeria", url: "/galeria", icon: Images },
  { title: "Mentoria", url: "/mentoria", icon: Users },
  { title: "IA Musical", url: "/chat", icon: Sparkles },
  { title: "Configurações e alertas", url: "/dispositivos", icon: Smartphone },
];

const teacher = [
  { title: "Painel do Professor", url: "/admin", icon: Shield },
];



export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({
    select: (router) => router.location.pathname,
  });

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async (uid: string | null) => {
      if (!alive) return;
      setUserId(uid);
      if (!uid) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .in("role", ["admin", "mentor"]);
      if (alive) setIsAdmin(!!data && data.length > 0);
    };
    void supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void load(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // só considera a sessão depois da hidratação, para o HTML do servidor bater com o do navegador
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && !!userId;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="group flex items-center gap-2.5 px-2 py-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border/60 transition-transform group-hover:scale-105"
            style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-warm)" }}
          >
            <img src={logoEscola} alt="" aria-hidden className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">Ezequiel Pereira</span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Escola de Violão
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{signedIn ? "Aluno" : "A escola"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(signedIn ? primary : publicNav).map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="rounded-lg data-[active=true]:bg-primary/12 data-[active=true]:font-semibold data-[active=true]:text-primary"
                  >
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!signedIn && (
          <SidebarGroup>
            <SidebarGroupLabel>Contato</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {publicLinks.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="rounded-lg">
                      <a
                        href={item.href}
                        target={item.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {signedIn && (
          <SidebarGroup>
            <SidebarGroupLabel>Jornada</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {growth.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="rounded-lg data-[active=true]:bg-primary/12 data-[active=true]:font-semibold data-[active=true]:text-primary"
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {signedIn && isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Professor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teacher.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="rounded-lg data-[active=true]:bg-primary/12 data-[active=true]:font-semibold data-[active=true]:text-primary"
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="mx-1 mb-1 rounded-xl border border-border/60 bg-muted/40 p-2.5 text-[11px] leading-snug text-muted-foreground">
            <span className="block font-semibold text-foreground">Sábados</span>
            13h · iniciantes  ·  14h30 · avançado
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            {signedIn ? (
              <SidebarMenuButton
                onClick={() => {
                  void supabase.auth.signOut();
                }}
                tooltip="Sair da conta"
                className="flex items-center gap-2 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sair da conta</span>}
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                asChild
                tooltip="Entrar / Cadastrar"
                className="rounded-lg bg-primary/10 font-semibold text-primary hover:bg-primary/15"
              >
                <Link to="/auth" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  {!collapsed && <span>Entrar / Cadastrar</span>}
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

    </Sidebar>
  );
}