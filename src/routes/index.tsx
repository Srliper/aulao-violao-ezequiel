import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Trophy, Users, Sparkles, MapPin, Phone, Clock, X, ChevronLeft, ChevronRight, ZoomIn, Navigation as NavigationIcon, MessageCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import violoesEscola1 from "@/assets/violoes-escola-1.jpg";
import violoesEscola2 from "@/assets/violoes-escola-2.jpg";
import ezequielProfessor from "@/assets/ezequiel-professor.jpg";
import logoEscola from "@/assets/logo-escola.png";
import heroPalco from "@/assets/hero-palco-v2.jpg";
import bgPartitura from "@/assets/bg-partitura-v2.jpg";
import bgEnsaio from "@/assets/bg-ensaio-v2.jpg";
import bgPalcoCta from "@/assets/bg-palco-cta-v2.jpg";
import heroVideo from "@/assets/hero-palco.mp4.asset.json";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Escola de Violão Ezequiel Pereira · Portal Califórnia" },
      {
        name: "description",
        content:
          "Aulas de violão aos sábados com o professor Ezequiel Pereira. Jornada gamificada, mentoria entre alunos e IA musical para tirar dúvidas.",
      },
      { property: "og:title", content: "Escola de Violão Ezequiel Pereira · Portal Califórnia" },
      {
        property: "og:description",
        content:
          "Aulas de violão aos sábados com o professor Ezequiel Pereira. Jornada gamificada, mentoria entre alunos e IA musical para tirar dúvidas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ranks = [
  { emoji: "🌱", name: "Iniciado", desc: "Acordes básicos e afinação", color: "var(--accent)" },
  { emoji: "🎵", name: "Amador", desc: "Menores e dedilhado PIMA", color: "var(--primary)" },
  { emoji: "⭐", name: "Aspirante", desc: "Pentatônica e acordes com 7ª", color: "var(--highlight)" },
  { emoji: "🔥", name: "Sênior", desc: "Hammer-on, slide e harmonia", color: "var(--secondary)" },
  { emoji: "👑", name: "Mestre", desc: "Domínio total e ensino", color: "#B8860B" },
];

const features = [
  { icon: Trophy, title: "Sistema de Patentes", desc: "Evolua do Iniciado ao Mestre com metas claras a cada etapa." },
  { icon: Users, title: "Mentoria entre Alunos", desc: "Alunos Sênior e Mestre orientam os iniciantes em sessões dedicadas." },
  { icon: Sparkles, title: "IA Musical", desc: "Um professor virtual paciente para explicar cifras, escalas e técnica." },
];

function Index() {
  const trackContactClick = useCallback(
    (channel: "whatsapp" | "phone", source = "home_hero") => {
      try {
        void supabase.from("contact_clicks").insert({
          channel,
          source,
          user_agent:
            typeof navigator !== "undefined"
              ? navigator.userAgent.slice(0, 500)
              : null,
        });
      } catch {
        // fire-and-forget: never block navigation on analytics
      }
    },
    [],
  );

  const gallery = [
    { src: violoesEscola1, alt: "Violões coloridos enfileirados sob telhado rústico" },
    { src: violoesEscola2, alt: "Aluna ao lado da coleção de violões da escola" },
  ];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const nextImage = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i + 1) % gallery.length)),
    [gallery.length]
  );
  const prevImage = useCallback(
    () => setLightboxIndex((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length)),
    [gallery.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") nextImage();
      else if (e.key === "ArrowLeft") prevImage();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, closeLightbox, nextImage, prevImage]);

  return (
    <div className="min-h-full">
      {/* HERO */}
      <section
        className="film-grain stage-vignette relative overflow-hidden bg-[#0b0605]"
        style={{
          backgroundImage:
            "radial-gradient(110% 80% at 72% 8%, rgba(255,205,125,0.38), transparent 58%), radial-gradient(90% 70% at 12% 100%, rgba(160,32,24,0.35), transparent 60%), linear-gradient(160deg, #2c100c 0%, #170b09 48%, #070403 100%)",
        }}
      >
        {!heroImgFailed && (
          <>
            <img
              src={heroPalco}
              alt="Violão em silhueta sob a luz quente de um refletor de palco"
              width={1920}
              height={1088}
              onError={() => setHeroImgFailed(true)}
              className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover object-[62%_38%] opacity-70 sm:object-[68%_center] sm:opacity-80"
            />
            <video
              src={heroVideo.url}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover object-[62%_38%] opacity-60 sm:object-[68%_center] sm:opacity-70"
            />
          </>
        )}

        <div
          className="spotlight-drift pointer-events-none absolute -top-1/3 right-[8%] h-[120%] w-[55%] blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(255,198,112,0.35), rgba(255,150,60,0.12) 55%, transparent 75%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-multiply"
          style={{ background: "var(--gradient-hero)" }}
          aria-hidden
        />
        {/* overlay mobile: escurece de cima para baixo para o texto empilhado */}
        <div
          className="pointer-events-none absolute inset-0 sm:hidden"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(10,6,5,0.86) 0%, rgba(10,6,5,0.62) 45%, rgba(10,6,5,0.88) 100%), radial-gradient(circle at 78% 12%, rgba(255,196,110,0.3), transparent 55%)",
          }}
          aria-hidden
        />
        {/* overlay desktop: escurece da esquerda para a direita */}
        <div
          className="pointer-events-none absolute inset-0 hidden sm:block"
          style={{
            backgroundImage:
              "linear-gradient(100deg, rgba(10,6,5,0.92) 0%, rgba(10,6,5,0.72) 42%, rgba(10,6,5,0.25) 70%, rgba(10,6,5,0.55) 100%), radial-gradient(circle at 72% 18%, rgba(255,196,110,0.28), transparent 45%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background sm:h-24"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 text-primary-foreground sm:px-6 sm:py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:py-28">
          <div className="flex flex-col items-start gap-6">
            <img
              src={logoEscola}
              alt="Logo da Escola de Violão Ezequiel Pereira"
              width={1024}
              height={1024}
              className="h-20 w-20 drop-shadow-lg sm:h-24 sm:w-24"
            />

            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              🎸 Aulas de violão · Portal Califórnia
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-6xl">
              Do primeiro acorde ao palco.
              <br />
              <span className="text-highlight">Sua jornada musical começa aqui.</span>
            </h1>
            <p className="max-w-xl text-base text-primary-foreground/90 sm:text-lg md:text-xl">
              Com o professor <strong>Ezequiel Pereira</strong> (10+ anos de estrada), aulas gamificadas,
              mentoria entre alunos e uma IA musical para tirar dúvidas a qualquer hora.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-highlight text-highlight-foreground hover:bg-highlight/90">
                <Link to="/auth">Começar agora</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20">
                <a
                  href={`https://web.whatsapp.com/send?phone=5514998695865&text=${encodeURIComponent(
                    "Olá Ezequiel! Vim pelo Portal Califórnia e quero saber mais sobre as aulas de violão.",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContactClick("whatsapp", "home_hero")}
                >
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[18rem] pb-10 sm:max-w-sm sm:pb-12 md:max-w-none md:pb-6">
            <div
              className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-highlight/30 blur-2xl sm:-inset-4"
              aria-hidden
            />
            <div className="relative aspect-[3/4] overflow-hidden rounded-[1.5rem] border-4 border-white/20 shadow-2xl sm:rounded-[1.75rem]">
              <img
                src={ezequielProfessor}
                alt="Professor Ezequiel Pereira sorrindo com violão clássico na sala de aulas"
                className="h-full w-full object-cover object-[center_20%]"
                loading="eager"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-2xl bg-card px-4 py-2.5 text-foreground shadow-xl sm:py-3 md:-bottom-4 md:left-0 md:-translate-x-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                Seu professor
              </div>
              <div className="text-sm font-bold whitespace-nowrap">Ezequiel Pereira 🎸</div>
            </div>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <section className="relative overflow-hidden border-y border-border/60 bg-card">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(90deg, color-mix(in oklab, var(--primary) 14%, transparent) 0 1px, transparent 1px 34px)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--highlight) 12%, transparent), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl gap-4 px-6 py-6 sm:grid-cols-3">
          <InfoItem icon={Clock} title="Sábados" desc="13h · Iniciantes/Crianças  ·  14h30 · Adultos/Avançado" />
          <InfoItem icon={MapPin} title="Endereço" desc="Rua Ver. João Agostinho, 175 — Portal Califórnia" />
          <InfoItem icon={Phone} title="Contato" desc="(14) 99869-5865" />
        </div>
      </section>

      {/* PATENTES */}
      <section className="film-grain relative overflow-hidden">
        <img
          src={bgPartitura}
          alt=""
          aria-hidden
          width={1536}
          height={1024}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-40 [mask-image:linear-gradient(180deg,transparent,black_18%,black_78%,transparent)]"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 20% 10%, color-mix(in oklab, var(--highlight) 16%, transparent), transparent 65%), linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 74%, transparent) 38%, color-mix(in oklab, var(--background) 86%, transparent) 100%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-12 grid gap-4 sm:grid-cols-2">
          {gallery.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openLightbox(i)}
              aria-label={`Ampliar imagem: ${img.alt}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-border/60 sm:aspect-[3/4] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <span className="pointer-events-none absolute inset-0 flex items-end justify-end p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-black/60 p-2 text-white">
                  <ZoomIn className="h-4 w-4" />
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="mb-10 flex flex-col items-center text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">Gamificação</span>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Sistema de Patentes</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Cada etapa desbloqueia novos desafios musicais — do primeiro dedilhado ao domínio do instrumento.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ranks.map((r) => (
            <Card
              key={r.name}
              className="group relative overflow-hidden border-border/60 bg-card transition-transform hover:-translate-y-1"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="h-1.5 w-full" style={{ background: r.color as string }} aria-hidden />
              <CardContent className="p-5">
                <div className="text-3xl">{r.emoji}</div>
                <h3 className="mt-2 text-lg font-bold">{r.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="film-grain stage-vignette relative overflow-hidden bg-[#100a08] py-16">
        <img
          src={bgEnsaio}
          alt=""
          aria-hidden
          width={1536}
          height={1024}
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-55"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 55% at 50% 0%, rgba(255,190,110,0.20), transparent 60%), linear-gradient(180deg, rgba(16,10,8,0.94), rgba(16,10,8,0.62) 45%, rgba(16,10,8,0.96))",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-10 flex flex-col items-center text-center text-primary-foreground">
            <span className="text-sm font-semibold uppercase tracking-wider text-highlight">Como funciona</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Muito mais que uma aula</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/60 bg-card p-2">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground"
                    style={{ background: "var(--gradient-cool)" }}
                  >
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div
          className="film-grain relative flex flex-col items-center gap-6 overflow-hidden rounded-3xl border border-white/10 px-8 py-14 text-center text-primary-foreground"
          style={{ background: "#150a08", boxShadow: "var(--shadow-warm)" }}
        >
          <img
            src={bgPalcoCta}
            alt=""
            aria-hidden
            width={1536}
            height={1024}
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-85"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(85% 110% at 50% 50%, rgba(12,6,5,0.55), rgba(12,6,5,0.86) 100%), radial-gradient(70% 90% at 50% 118%, color-mix(in oklab, var(--highlight) 30%, transparent), transparent 60%)",
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-6">
          <img
            src={logoEscola}
            alt="Emblema da Escola de Violão Ezequiel Pereira"
            width={1024}
            height={1024}
            loading="lazy"
            className="h-16 w-16"
          />
          <h2 className="text-3xl font-bold md:text-4xl">Pronto para tocar sua primeira música?</h2>
          <p className="max-w-xl text-primary-foreground/90">
            Crie sua conta e entre para a comunidade da Escola de Violão Ezequiel Pereira.
          </p>
          <Button asChild size="lg" className="rounded-full bg-background text-foreground hover:bg-background/90">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
          </div>
        </div>
      </section>

      {/* COMO CHEGAR */}
      <section className="border-t border-border/60 bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">
              Onde acontece
            </span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Como chegar às aulas</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Rua Ver. João Agostinho, 175 — Portal Califórnia. Sábados às 13h e 14h30.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div
              className="overflow-hidden rounded-3xl border border-border/60"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <iframe
                title="Mapa da Escola de Violão Ezequiel Pereira em Portal Califórnia"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  "Rua Vereador João Agostinho, 175, Portal Califórnia",
                )}&z=16&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[320px] w-full border-0 sm:h-[420px]"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Card className="border-border/60">
                <CardContent className="space-y-4 p-5">
                  <InfoItem
                    icon={MapPin}
                    title="Endereço"
                    desc="Rua Ver. João Agostinho, 175 — Portal Califórnia"
                  />
                  <InfoItem
                    icon={Clock}
                    title="Horários"
                    desc="Sábados · 13h iniciantes · 14h30 avançado"
                  />
                  <InfoItem icon={Phone} title="Contato" desc="(14) 99869-5865" />
                </CardContent>
              </Card>

              <Button asChild size="lg" className="rounded-full">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    "Rua Vereador João Agostinho, 175, Portal Califórnia",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <NavigationIcon className="mr-2 h-4 w-4" />
                  Traçar rota no Google Maps
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <a
                  href={`https://waze.com/ul?q=${encodeURIComponent(
                    "Rua Vereador João Agostinho, 175, Portal Califórnia",
                  )}&navigate=yes`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <NavigationIcon className="mr-2 h-4 w-4" />
                  Abrir no Waze
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-full">
                <a
                  href={`https://web.whatsapp.com/send?phone=5514998695865&text=${encodeURIComponent(
                    "Olá Ezequiel! Quero falar direto com você sobre as aulas de violão.",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContactClick("whatsapp", "home_mapa")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar com o mentor Ezequiel
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-card">

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground md:flex-row">
          <span className="flex items-center gap-2">
            <img
              src={logoEscola}
              alt="Logo da escola"
              width={1024}
              height={1024}
              loading="lazy"
              className="h-7 w-7"
            />
            © {new Date().getFullYear()} Escola de Violão Ezequiel Pereira
          </span>
          <span>Portal Califórnia · (14) 99869-5865</span>
        </div>
      </footer>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de imagens ampliadas"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
          >
            <X className="h-6 w-6" />
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                aria-label="Imagem anterior"
                className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6 sm:h-12 sm:w-12"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                aria-label="Próxima imagem"
                className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:h-12 sm:w-12"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <figure
            className="relative flex max-h-[90vh] max-w-[92vw] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={gallery[lightboxIndex].src}
              alt={gallery[lightboxIndex].alt}
              className="max-h-[82vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            />
            <figcaption className="text-center text-sm text-white/80">
              {gallery[lightboxIndex].alt}
              {gallery.length > 1 && (
                <span className="ml-2 text-white/50">
                  {lightboxIndex + 1} / {gallery.length}
                </span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Clock;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
