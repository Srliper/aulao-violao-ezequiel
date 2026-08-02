import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2, Images } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/galeria")({
  head: () => ({
    meta: [
      { title: "Galeria de Fotos · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Momentos das aulas, apresentações e conquistas da nossa turma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GaleriaPage,
});

type Photo = {
  id: string;
  title: string | null;
  caption: string | null;
  image_path: string;
  event_date: string | null;
  created_at: string;
  url?: string;
};

function GaleriaPage() {
  const { user } = Route.useRouteContext() as { user: { id: string } };
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [eventDate, setEventDate] = useState("");

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

  const { data: photos, isLoading } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("id, title, caption, image_path, event_date, created_at")
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .returns<Photo[]>();
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

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Escolha uma foto para enviar.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("galeria")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { error } = await supabase.from("gallery_photos").insert({
        title: title.trim() || null,
        caption: caption.trim() || null,
        image_path: path,
        event_date: eventDate || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Foto adicionada à galeria!");
      setFile(null);
      setTitle("");
      setCaption("");
      setEventDate("");
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePhoto = useMutation({
    mutationFn: async (photo: Photo) => {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
      if (error) throw error;
      await supabase.storage.from("galeria").remove([photo.image_path]);
    },
    onSuccess: () => {
      toast.success("Foto removida.");
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Galeria de Fotos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Momentos das aulas, apresentações e conquistas da nossa turma.
        </p>
      </header>

      {isAdmin && (
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImagePlus className="h-4 w-4" /> Adicionar foto
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Foto</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data do evento</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Apresentação de fim de ano"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Legenda</Label>
              <Textarea
                rows={2}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Conte um pouco sobre esse momento"
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={() => upload.mutate()} disabled={upload.isPending} className="gap-2">
                <ImagePlus className="h-4 w-4" />
                {upload.isPending ? "Enviando..." : "Enviar foto"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (photos ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <Images className="h-8 w-8 opacity-50" />
            Ainda não há fotos na galeria.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(photos ?? []).map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.url && (
                <img
                  src={p.url}
                  alt={p.title ?? "Foto da Escola de Violão Ezequiel Pereira"}
                  loading="lazy"
                  className="h-48 w-full object-cover"
                />
              )}
              <CardContent className="space-y-1 p-4">
                {p.title && <h2 className="font-semibold leading-tight">{p.title}</h2>}
                {p.event_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(`${p.event_date}T12:00:00`).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {p.caption && <p className="text-sm text-muted-foreground">{p.caption}</p>}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-1 text-muted-foreground"
                    onClick={() => removePhoto.mutate(p)}
                  >
                    <Trash2 className="h-4 w-4" /> Remover
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
