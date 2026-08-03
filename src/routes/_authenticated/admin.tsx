import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Phone,
  GraduationCap,
  ClipboardCheck,
  Music4,
  Images,
  Trash2,
  RefreshCw,
  Plus,
  BellRing,
} from "lucide-react";

import { PracticeReminderAdmin } from "@/components/practice-reminder-admin";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do Professor · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Gestão de alunos, repertório e galeria da escola." },
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
  component: AdminPage,
});

type Turma = "all" | "13:00" | "14:30" | "none";
type AppRole = "admin" | "mentor" | "student";

type StudentRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  class_time: string | null;
  started_at: string;
  rank_id: number | null;
  ranks: { name: string; color: string; icon: string } | null;
};

type RepertoireRow = {
  id: string;
  title: string;
  artist: string | null;
  level: string | null;
  class_time: string | null;
  video_url: string | null;
  created_at: string;
};

type PhotoRow = {
  id: string;
  title: string | null;
  caption: string | null;
  image_path: string;
  event_date: string | null;
  created_at: string;
  url?: string;
};

const NONE = "__none__";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function AdminPage() {
  const queryClient = useQueryClient();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel do Professor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie alunos, repertório e galeria em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="gap-2">
            <Link to="/chamada">
              <ClipboardCheck className="h-4 w-4" />
              Fazer chamada
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/convites">Convidar alunos</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/aulas">Agenda de sábado</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/mensagens">Mensagens dos alunos</Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              queryClient.invalidateQueries();
              toast.success("Listas atualizadas");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </header>

      <Tabs defaultValue="alunos">
        <TabsList className="mb-6">
          <TabsTrigger value="alunos" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Alunos
          </TabsTrigger>
          <TabsTrigger value="repertorio" className="gap-2">
            <Music4 className="h-4 w-4" /> Repertório
          </TabsTrigger>
          <TabsTrigger value="galeria" className="gap-2">
            <Images className="h-4 w-4" /> Galeria
          </TabsTrigger>
          <TabsTrigger value="lembretes" className="gap-2">
            <BellRing className="h-4 w-4" /> Lembretes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alunos">
          <StudentsPanel />
        </TabsContent>
        <TabsContent value="repertorio">
          <RepertoirePanel />
        </TabsContent>
        <TabsContent value="galeria">
          <GalleryPanel />
        </TabsContent>
        <TabsContent value="lembretes">
          <PracticeReminderAdmin />
        </TabsContent>
      </Tabs>

    </div>
  );
}

/* ---------------- Alunos ---------------- */

function StudentsPanel() {
  const queryClient = useQueryClient();
  const [turma, setTurma] = useState<Turma>("all");
  const [search, setSearch] = useState("");

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map = new Map<string, AppRole>();
      for (const r of data ?? []) map.set(r.user_id, r.role as AppRole);
      return map;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, class_time, started_at, rank_id, ranks(name, color, icon)")
        .order("full_name", { ascending: true })
        .returns<StudentRow[]>();
      if (error) throw error;
      return profiles ?? [];
    },
  });

  const students = data ?? [];

  const updateStudent = useMutation({
    mutationFn: async ({ id, class_time }: { id: string; class_time: string | null }) => {
      const { error } = await supabase.from("profiles").update({ class_time }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Turma atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: ranksList } = useQuery({
    queryKey: ["admin-ranks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ranks")
        .select("id, name, icon, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateRank = useMutation({
    mutationFn: async ({ id, rank_id }: { id: string; rank_id: number | null }) => {
      const { error } = await supabase.from("profiles").update({ rank_id }).eq("id", id);
      if (error) throw error;
      const rank = ranksList?.find((r) => r.id === rank_id);
      if (rank) {
        await supabase.from("notifications").insert({
          user_id: id,
          title: `Nova patente: ${rank.icon} ${rank.name}`,
          body: "O professor Ezequiel reconheceu sua evolução. Parabéns!",
          link: "/patentes",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-students"] });
      toast.success("Patente atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", id);
      if (delErr) throw delErr;
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      toast.success("Cargo atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const counts = useMemo(() => {
    const c = { all: students.length, "13:00": 0, "14:30": 0, none: 0 };
    for (const s of students) {
      if (s.class_time === "13:00") c["13:00"]++;
      else if (s.class_time === "14:30") c["14:30"]++;
      else c.none++;
    }
    return c;
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchTurma =
        turma === "all" ? true : turma === "none" ? !s.class_time : s.class_time === turma;
      if (!matchTurma) return false;
      if (!q) return true;
      return (
        (s.full_name ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [students, turma, search]);

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Total de alunos" value={counts.all} accent="bg-primary/10 text-primary" />
        <StatCard label="Sábado 13h" value={counts["13:00"]} accent="bg-secondary/15 text-secondary" />
        <StatCard
          label="Sábado 14h30"
          value={counts["14:30"]}
          accent="bg-[color:var(--turquoise)]/15 text-[color:var(--turquoise)]"
        />
        <StatCard label="Sem turma" value={counts.none} accent="bg-muted text-muted-foreground" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={turma} onValueChange={(v) => setTurma(v as Turma)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
            <TabsTrigger value="13:00">13h ({counts["13:00"]})</TabsTrigger>
            <TabsTrigger value="14:30">14h30 ({counts["14:30"]})</TabsTrigger>
            <TabsTrigger value="none">Sem turma ({counts.none})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum aluno encontrado com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              role={roles?.get(s.id) ?? "student"}
              ranks={ranksList ?? []}
              onTurma={(class_time) => updateStudent.mutate({ id: s.id, class_time })}
              onRole={(role) => updateRole.mutate({ id: s.id, role })}
              onRank={(rank_id) => updateRank.mutate({ id: s.id, rank_id })}
            />

          ))}
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-none">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type RankOption = { id: number; name: string; icon: string; sort_order: number };

function StudentCard({
  student,
  role,
  ranks,
  onTurma,
  onRole,
  onRank,
}: {
  student: StudentRow;
  role: AppRole;
  ranks: RankOption[];
  onTurma: (v: string | null) => void;
  onRole: (v: AppRole) => void;
  onRank: (v: number | null) => void;
}) {

  const rank = student.ranks;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials(student.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {student.full_name ?? "Sem nome"}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Desde {new Date(student.started_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          {rank && (
            <Badge variant="secondary" className="gap-1">
              <span>{rank.icon}</span>
              <span>{rank.name}</span>
            </Badge>
          )}
          {student.phone && (
            <a
              href={`https://wa.me/55${student.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <Phone className="h-3 w-3" />
              {student.phone}
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={student.class_time ?? NONE}
            onValueChange={(v) => onTurma(v === NONE ? null : v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="13:00">Sábado 13h</SelectItem>
              <SelectItem value="14:30">Sábado 14h30</SelectItem>
              <SelectItem value={NONE}>Sem turma</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => onRole(v as AppRole)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Aluno</SelectItem>
              <SelectItem value="mentor">Monitor</SelectItem>
              <SelectItem value="admin">Professor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Patente concedida pelo professor
          </p>
          <Select
            value={student.rank_id === null ? NONE : String(student.rank_id)}
            onValueChange={(v) => onRank(v === NONE ? null : Number(v))}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Patente" />
            </SelectTrigger>
            <SelectContent>
              {ranks.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.icon} {r.name}
                  {r.name === "Mestre" ? " (mesma do professor)" : ""}
                </SelectItem>
              ))}
              <SelectItem value={NONE}>Sem patente</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </CardContent>
    </Card>
  );
}

/* ---------------- Repertório ---------------- */

function RepertoirePanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-repertoire"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repertoire")
        .select("id, title, artist, level, class_time, video_url, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .returns<RepertoireRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { level?: string | null; class_time?: string | null };
    }) => {
      const { error } = await supabase.from("repertoire").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repertoire"] });
      queryClient.invalidateQueries({ queryKey: ["repertoire"] });
      toast.success("Música atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repertoire").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-repertoire"] });
      queryClient.invalidateQueries({ queryKey: ["repertoire"] });
      toast.success("Música removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) || (r.artist ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar música ou artista"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/repertorio">
            <Plus className="h-4 w-4" />
            Adicionar música
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma música cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.artist ?? "Artista não informado"}
                  </p>
                </div>
                <Select
                  value={r.level ?? NONE}
                  onValueChange={(v) =>
                    update.mutate({ id: r.id, patch: { level: v === NONE ? null : v } })
                  }
                >
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <SelectValue placeholder="Nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                    <SelectItem value={NONE}>Sem nível</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={r.class_time ?? NONE}
                  onValueChange={(v) =>
                    update.mutate({ id: r.id, patch: { class_time: v === NONE ? null : v } })
                  }
                >
                  <SelectTrigger className="h-9 w-36 text-xs">
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="13:00">Sábado 13h</SelectItem>
                    <SelectItem value="14:30">Sábado 14h30</SelectItem>
                    <SelectItem value={NONE}>Todas as turmas</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remover "${r.title}" do repertório?`)) remove.mutate(r.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Galeria ---------------- */

function GalleryPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, title, caption, image_path, event_date, created_at")
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .returns<PhotoRow[]>();
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return rows;
      const { data: signed } = await supabase.storage
        .from("galeria")
        .createSignedUrls(rows.map((r) => r.image_path), 60 * 60);
      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      return rows.map((r) => ({ ...r, url: map.get(r.image_path) ?? undefined }));
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: PhotoRow) => {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
      if (error) throw error;
      await supabase.storage.from("galeria").remove([photo.image_path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      toast.success("Foto removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const photos = data ?? [];

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {photos.length} foto{photos.length === 1 ? "" : "s"} na galeria
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/galeria">
            <Plus className="h-4 w-4" />
            Enviar foto
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma foto enviada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.title ?? "Foto da galeria"}
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  Imagem indisponível
                </div>
              )}
              <CardContent className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title ?? "Sem título"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.event_date
                      ? new Date(p.event_date + "T00:00:00").toLocaleDateString("pt-BR")
                      : new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Remover esta foto da galeria?")) remove.mutate(p);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
