import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type RepertoireItem = {
  title?: string | null;
  artist?: string | null;
  level?: string | null;
  class_time?: string | null;
  notes?: string | null;
};

type ChatRequestBody = {
  messages?: unknown;
  context?: {
    studentName?: string | null;
    classTime?: string | null;
    rank?: string | null;
    repertoire?: RepertoireItem[];
  };
};

function buildSystemPrompt(context: ChatRequestBody["context"]) {
  const lines: string[] = [
    "Você é o professor virtual da Escola de Violão Ezequiel Pereira.",
    "Responda SEMPRE em português do Brasil, de forma paciente, prática e encorajadora.",
    "Você ensina violão: acordes, cifras, ritmos/batidas, escalas, técnica de mão direita e esquerda, afinação, teoria básica e preparação para apresentações.",
    "Dê respostas curtas e objetivas (no máximo ~200 palavras), com passos práticos e exercícios quando fizer sentido.",
    "Use markdown simples. Ao mostrar cifras, use blocos de código com os acordes alinhados.",
    "Se a pergunta não tiver relação com música/violão/aula, redirecione gentilmente para o conteúdo da escola.",
    "Quando a dúvida for sobre uma música que está no repertório da turma, use essas informações como referência.",
  ];

  if (context?.studentName) lines.push(`Nome do aluno: ${context.studentName}.`);
  if (context?.classTime) lines.push(`Turma do aluno: aula das ${context.classTime}.`);
  if (context?.rank) lines.push(`Patente atual do aluno: ${context.rank}. Ajuste o nível da explicação a isso.`);

  const rep = (context?.repertoire ?? []).slice(0, 40);
  if (rep.length > 0) {
    lines.push(
      "Repertório atual disponível na escola (título — artista — nível — turma):",
      ...rep.map(
        (item) =>
          `- ${item.title ?? "Sem título"} — ${item.artist ?? "artista não informado"} — ${
            item.level ?? "nível livre"
          } — ${item.class_time ? `turma ${item.class_time}` : "todas as turmas"}${
            item.notes ? ` — obs: ${String(item.notes).slice(0, 160)}` : ""
          }`,
      ),
    );
  } else {
    lines.push("Nenhuma música cadastrada no repertório no momento.");
  }

  return lines.join("\n");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);

        const result = streamText({
          model: gateway("openai/gpt-5.6-sol"),
          system: buildSystemPrompt(body.context),
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          providerOptions: { lovable: { reasoningEffort: "none" } },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
        });
      },
    },
  },
});
