import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import bgIaMusical from "@/assets/bg-ia-musical.jpg";
import logoEscola from "@/assets/logo-escola.png";


export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "IA Musical · Escola de Violão Ezequiel Pereira" },
      { name: "description", content: "Tire dúvidas sobre cifras, escalas e técnica com a IA musical da escola." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Como faço a passagem do acorde G para C sem travar?",
  "Me ensina uma batida simples para tocar as músicas da minha turma.",
  "Qual música do repertório é boa para eu começar?",
  "Como treinar troca de acordes em 10 minutos por dia?",
];

function ChatPage() {
  const { user } = Route.useRouteContext();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, class_time, ranks(name)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: repertoire } = useQuery({
    queryKey: ["repertoire-context"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repertoire")
        .select("title, artist, level, class_time, notes")
        .order("sort_order", { ascending: true })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  const context = useMemo(() => {
    const classTime = profile?.class_time ?? null;
    const list = (repertoire ?? []).filter(
      (item) => !classTime || !item.class_time || item.class_time === classTime,
    );
    return {
      studentName: profile?.full_name ?? null,
      classTime,
      rank: (profile as { ranks?: { name?: string } | null } | null)?.ranks?.name ?? null,
      repertoire: list,
    };
  }, [profile, repertoire]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, messages, context },
        }),
      }),
    [context],
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    onError: (err) => {
      console.error(err);
      toast.error("Não consegui responder agora. Tente novamente em instantes.");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function send(text: string) {
    const value = text.trim();
    if (!value || isLoading) return;
    void sendMessage({ text: value });
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Fundo temático: ondas sonoras e notas sobre braço de violão */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src={bgIaMusical}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={1600}
          height={1000}
          className="h-full w-full object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/85 to-background" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 sm:px-6">
        <header className="mb-6 flex items-center gap-3">
          <img
            src={logoEscola}
            alt="Escola de Violão Ezequiel Pereira"
            loading="lazy"
            width={44}
            height={44}
            className="h-11 w-11 rounded-2xl object-contain"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">IA Musical</h1>
            <p className="text-sm text-muted-foreground">
              Professor virtual com o repertório
              {profile?.class_time ? ` da sua turma das ${profile.class_time}` : " da escola"}.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
              <RotateCcw className="mr-2 h-4 w-4" /> Nova conversa
            </Button>
          )}
        </header>


      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Pergunte o que quiser sobre violão: cifras, batidas, escalas, técnica ou as músicas
                do repertório da sua turma.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((message) => {
          const text = message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("");
          const isUser = message.role === "user";
          return (
            <div key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-card-foreground",
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{text}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Pensando...
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Ocorreu um erro ao falar com a IA. Tente enviar sua pergunta novamente.
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        className="sticky bottom-0 mt-6 flex items-end gap-2 bg-background/90 py-3 backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          placeholder="Escreva sua dúvida sobre violão..."
          rows={2}
          className="min-h-[56px] resize-none"
        />
        <Button type="submit" size="icon" className="h-[56px] w-[56px]" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
        </form>
      </div>
    </div>
  );
}

