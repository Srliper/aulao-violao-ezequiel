import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const WHATSAPP = `https://wa.me/5514998695865?text=${encodeURIComponent(
  "Olá Ezequiel! Quero falar direto com você sobre as aulas de violão.",
)}`;

/**
 * Botão flutuante para falar direto com o mentor Ezequiel.
 * Aluno logado vai para o chat interno; visitante vai para o WhatsApp.
 */
export function MentorCta() {
  const [signedIn, setSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!mounted) return null;

  const classes =
    "group fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40";
  const style = {
    background: "var(--gradient-hero)",
    boxShadow: "var(--shadow-warm)",
  } as const;
  const label = (
    <>
      {signedIn ? <Send className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      <span className="hidden sm:inline">Falar com o mentor Ezequiel</span>
      <span className="sr-only sm:hidden">Falar com o mentor Ezequiel</span>
    </>
  );

  return signedIn ? (
    <Link to="/mensagens" className={classes} style={style} aria-label="Falar com o mentor Ezequiel">
      {label}
    </Link>
  ) : (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
      style={style}
      aria-label="Falar com o mentor Ezequiel no WhatsApp"
    >
      {label}
    </a>
  );
}
