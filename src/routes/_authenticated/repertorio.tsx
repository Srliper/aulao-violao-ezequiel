import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music4, Plus, Search, Trash2, X, Youtube } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/repertorio")({
  head: () => ({
    meta: [
      { title: "Repertório · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Repertório de músicas da escola, com nível, cifras e vídeos de referência." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RepertorioPage,
});

type Repertoire = {
  id: string;
  title: string;
  artist: string | null;
  level: string | null;
  notes: string | null;
  video_url: string | null;
  class_time: string | null;
  created_at: string;
};

const LEVELS = ["Iniciado", "Amador", "Aspirante", "Sênior", "Mestre"];

function RepertorioPage() {
  const { user } = Route.useRouteContext() as { user: { id: string } };
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [form, setForm] = useState({
    title: "",
    artist: "",
    level: LEVELS[0],
    notes: "",
    video_url: "",
    class_time: "",
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const { data: songs, isLoading } = useQuery({
    queryKey: ["repertoire"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repertoire")
        .select("id, title, artist, level, notes, video_url, class_time, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .returns<Repertoire[]>();
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSong = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Informe o nome da música.");
      const { error } = await supabase.from("repertoire").insert({
        title: form.title.trim(),
        artist: form.artist.trim() || null,
        level: form.level || null,
        notes: form.notes.trim() || null,
        video_url: form.video_url.trim() || null,
        class_time: form.class_time || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Música adicionada ao repertório!");
      setForm({ title: "", artist: "", level: LEVELS[0], notes: "", video_url: "", class_time: "" });
      queryClient.invalidateQueries({ queryKey: ["repertoire"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSong = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repertoire").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Música removida.");
      queryClient.invalidateQueries({ queryKey: ["repertoire"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const artists = Array.from(
    new Set((songs ?? []).map((s) => s.artist?.trim()).filter((a): a is string => !!a)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const norm = (v: string) =>
    v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(search.trim());

  const list = (songs ?? []).filter((s) => {
    if (filter !== "all" && s.level !== filter) return false;
    if (artistFilter !== "all" && (s.artist?.trim() ?? "") !== artistFilter) return false;
    if (classFilter !== "all") {
      if (classFilter === "none" ? !!s.class_time : s.class_time !== classFilter) return false;
    }
    if (q && !norm(`${s.title} ${s.artist ?? ""} ${s.notes ?? ""}`).includes(q)) return false;
    return true;
  });

  const hasFilters =
    !!search.trim() || filter !== "all" || artistFilter !== "all" || classFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setArtistFilter("all");
    setClassFilter("all");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Repertório</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As músicas que estamos estudando, organizadas por nível.
        </p>
      </header>

      {isAdmin && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Adicionar música
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Música</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Trem Bala"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Artista</Label>
              <Input
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
                placeholder="Ex.: Ana Vilela"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Turma (opcional)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.class_time}
                onChange={(e) => setForm({ ...form, class_time: e.target.value })}
              >
                <option value="">Todas as turmas</option>
                <option value="13:00">Sábado 13h</option>
                <option value="14:30">Sábado 14h30</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Link do vídeo (opcional)</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Cifra / observações</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Tom, acordes, batida, trechos para treinar..."
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => addSong.mutate()} disabled={addSong.isPending} className="gap-2">
                <Plus className="h-4 w-4" />
                {addSong.isPending ? "Salvando..." : "Adicionar ao repertório"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por música, artista ou cifra..."
            className="pl-9"
            aria-label="Buscar no repertório"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          aria-label="Filtrar por artista"
        >
          <option value="all">Todos os artistas</option>
          {artists.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          aria-label="Filtrar por turma"
        >
          <option value="all">Todas as turmas</option>
          <option value="13:00">Sábado 13h</option>
          <option value="14:30">Sábado 14h30</option>
          <option value="none">Sem turma definida</option>
        </select>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {LEVELS.map((l) => (
            <TabsTrigger key={l} value={l}>
              {l}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {list.length} {list.length === 1 ? "música" : "músicas"}
        </span>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
      </div>


      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma música no repertório ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Music4 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-tight">{s.title}</h2>
                  {s.artist && <p className="text-sm text-muted-foreground">{s.artist}</p>}
                  {s.notes && <p className="mt-2 whitespace-pre-line text-sm">{s.notes}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {s.level && <Badge variant="secondary">{s.level}</Badge>}
                    {s.class_time && <Badge variant="outline">Sábado {s.class_time}</Badge>}
                    {s.video_url && (
                      <a
                        href={s.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                      >
                        <Youtube className="h-3 w-3" /> Vídeo
                      </a>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSong.mutate(s.id)}
                    aria-label={`Remover ${s.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
