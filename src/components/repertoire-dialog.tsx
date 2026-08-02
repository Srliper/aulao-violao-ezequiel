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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const REPERTOIRE_LEVELS = ["Iniciado", "Amador", "Aspirante", "Sênior", "Mestre"];
const NONE = "__none__";

export type RepertoireDraft = {
  id?: string;
  title: string;
  artist: string | null;
  level: string | null;
  notes: string | null;
  video_url: string | null;
  class_time: string | null;
};

const empty: RepertoireDraft = {
  title: "",
  artist: "",
  level: REPERTOIRE_LEVELS[0],
  notes: "",
  video_url: "",
  class_time: null,
};

export function RepertoireDialog({
  open,
  onOpenChange,
  song,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  song?: RepertoireDraft | null;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RepertoireDraft>(song ?? empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(song ?? empty);
      setErrors({});
    }
  }, [open, song]);

  const validate = () => {
    const e: Record<string, string> = {};
    const title = form.title.trim();
    if (!title) e.title = "Informe o nome da música.";
    else if (title.length > 120) e.title = "Máximo de 120 caracteres.";
    if ((form.artist ?? "").trim().length > 120) e.artist = "Máximo de 120 caracteres.";
    if ((form.notes ?? "").trim().length > 2000) e.notes = "Máximo de 2000 caracteres.";
    const url = (form.video_url ?? "").trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol)) e.video_url = "Use um link http(s) válido.";
      } catch {
        e.video_url = "Link inválido. Ex.: https://youtu.be/...";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        artist: (form.artist ?? "").trim() || null,
        level: form.level || null,
        notes: (form.notes ?? "").trim() || null,
        video_url: (form.video_url ?? "").trim() || null,
        class_time: form.class_time || null,
      };
      if (song?.id) {
        const { error } = await supabase.from("repertoire").update(payload).eq("id", song.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("repertoire")
          .insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(song?.id ? "Música atualizada" : "Música adicionada");
      queryClient.invalidateQueries({ queryKey: ["repertoire"] });
      queryClient.invalidateQueries({ queryKey: ["admin-repertoire"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{song?.id ? "Editar música" : "Nova música"}</DialogTitle>
          <DialogDescription>
            Preencha os dados da música do repertório.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Música *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Trem Bala"
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Artista</Label>
            <Input
              value={form.artist ?? ""}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              placeholder="Ex.: Ana Vilela"
              aria-invalid={!!errors.artist}
            />
            {errors.artist && <p className="text-xs text-destructive">{errors.artist}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Nível</Label>
            <Select
              value={form.level ?? NONE}
              onValueChange={(v) => setForm({ ...form, level: v === NONE ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                {REPERTOIRE_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
                <SelectItem value={NONE}>Sem nível</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Turma</Label>
            <Select
              value={form.class_time ?? NONE}
              onValueChange={(v) => setForm({ ...form, class_time: v === NONE ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="13:00">Sábado 13h</SelectItem>
                <SelectItem value="14:30">Sábado 14h30</SelectItem>
                <SelectItem value={NONE}>Todas as turmas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vídeo de referência</Label>
            <Input
              value={form.video_url ?? ""}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder="https://youtu.be/..."
              aria-invalid={!!errors.video_url}
            />
            {errors.video_url && <p className="text-xs text-destructive">{errors.video_url}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cifra / observações</Label>
            <Textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Tom, cifra, dicas de estudo..."
              aria-invalid={!!errors.notes}
            />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
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
