import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PhotoDraft = {
  id?: string;
  title: string | null;
  caption: string | null;
  event_date: string | null;
  image_path?: string;
};

const empty: PhotoDraft = { title: "", caption: "", event_date: "" };
const MAX_MB = 8;

export function PhotoDialog({
  open,
  onOpenChange,
  photo,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photo?: PhotoDraft | null;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PhotoDraft>(photo ?? empty);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = !!photo?.id;

  useEffect(() => {
    if (open) {
      setForm(photo ?? empty);
      setFile(null);
      setErrors({});
    }
  }, [open, photo]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isEdit && !file) e.file = "Escolha uma foto para enviar.";
    if (file) {
      if (!file.type.startsWith("image/")) e.file = "O arquivo precisa ser uma imagem.";
      else if (file.size > MAX_MB * 1024 * 1024) e.file = `Imagem muito grande (máx. ${MAX_MB} MB).`;
    }
    if ((form.title ?? "").trim().length > 120) e.title = "Máximo de 120 caracteres.";
    if ((form.caption ?? "").trim().length > 500) e.caption = "Máximo de 500 caracteres.";
    if (form.event_date && Number.isNaN(new Date(form.event_date).getTime()))
      e.event_date = "Data inválida.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      let imagePath = photo?.image_path;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("galeria")
          .upload(path, file, { contentType: file.type || undefined });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const payload = {
        title: (form.title ?? "").trim() || null,
        caption: (form.caption ?? "").trim() || null,
        event_date: form.event_date || null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("gallery_photos")
          .update({ ...payload, image_path: imagePath! })
          .eq("id", photo!.id!);
        if (error) throw error;
        if (file && photo?.image_path && photo.image_path !== imagePath) {
          await supabase.storage.from("galeria").remove([photo.image_path]);
        }
      } else {
        const { error } = await supabase.from("gallery_photos").insert({
          ...payload,
          image_path: imagePath!,
          created_by: userId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Foto atualizada" : "Foto adicionada à galeria!");
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gallery"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar foto" : "Nova foto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados ou substitua a imagem."
              : "Envie uma foto e descreva o momento."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{isEdit ? "Substituir foto (opcional)" : "Foto *"}</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-invalid={!!errors.file}
            />
            {errors.file && <p className="text-xs text-destructive">{errors.file}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Data do evento</Label>
            <Input
              type="date"
              value={form.event_date ?? ""}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              aria-invalid={!!errors.event_date}
            />
            {errors.event_date && (
              <p className="text-xs text-destructive">{errors.event_date}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Título</Label>
            <Input
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Apresentação de fim de ano"
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Legenda</Label>
            <Textarea
              rows={3}
              value={form.caption ?? ""}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="Conte um pouco sobre esse momento"
              aria-invalid={!!errors.caption}
            />
            {errors.caption && <p className="text-xs text-destructive">{errors.caption}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (validate()) save.mutate();
            }}
            disabled={save.isPending}
          >
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
