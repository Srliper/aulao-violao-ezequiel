
-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'student');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE public.mentorship_status AS ENUM ('active', 'completed', 'paused');

-- ============== UPDATED_AT HELPER ==============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============== RANKS (referência pública) ==============
CREATE TABLE public.ranks (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  min_months INT NOT NULL DEFAULT 0,
  requirements TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.ranks TO anon, authenticated;
GRANT ALL ON public.ranks TO service_role;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranks_public_read" ON public.ranks FOR SELECT USING (true);

INSERT INTO public.ranks (slug, name, color, icon, min_months, requirements, sort_order) VALUES
  ('iniciado', 'Iniciado', '#4ECDC4', '🌱', 0, 'Acordes básicos maiores e afinação do violão.', 1),
  ('amador',   'Amador',   '#6B4EE6', '🎵', 3, 'Acordes menores e dedilhado PIMA.', 2),
  ('aspirante','Aspirante','#FFE66D', '⭐', 6, 'Escala pentatônica e acordes com 7ª.', 3),
  ('senior',   'Sênior',   '#FF6B9D', '🔥', 12, 'Hammer-on, slide e noções de harmonia.', 4),
  ('mestre',   'Mestre',   '#B8860B', '👑', 24, 'Domínio total do instrumento e capacidade de ensinar.', 5);

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  rank_id INT REFERENCES public.ranks(id) DEFAULT 1,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== USER ROLES (segurança) ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Policies profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policies user_roles
CREATE POLICY "roles_read_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============== ATTENDANCE ==============
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_date DATE NOT NULL,
  class_time TEXT NOT NULL DEFAULT '13:00',
  status public.attendance_status NOT NULL DEFAULT 'present',
  justification TEXT,
  checked_in_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_date, class_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_own_or_admin" ON public.attendance FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "attendance_insert_own_or_admin" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "attendance_admin_update" ON public.attendance FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "attendance_admin_delete" ON public.attendance FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============== MENTORSHIPS ==============
CREATE TABLE public.mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.mentorship_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (mentor_id <> mentee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorships TO authenticated;
GRANT ALL ON public.mentorships TO service_role;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mentorships_updated_at BEFORE UPDATE ON public.mentorships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "mentorships_read_participants_or_admin" ON public.mentorships FOR SELECT TO authenticated
  USING (mentor_id = auth.uid() OR mentee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mentorships_admin_write" ON public.mentorships FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mentorships_mentor_update" ON public.mentorships FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());

-- ============== MENTORSHIP SESSIONS ==============
CREATE TABLE public.mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ NOT NULL,
  modality TEXT NOT NULL DEFAULT 'in_person',
  topics_covered TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_sessions TO authenticated;
GRANT ALL ON public.mentorship_sessions TO service_role;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read_participants_or_admin" ON public.mentorship_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentorships m
      WHERE m.id = mentorship_id
        AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "sessions_write_mentor_or_admin" ON public.mentorship_sessions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.mentorships m WHERE m.id = mentorship_id AND m.mentor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.mentorships m WHERE m.id = mentorship_id AND m.mentor_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============== AI CHAT HISTORY ==============
CREATE TABLE public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_history TO authenticated;
GRANT ALL ON public.ai_chat_history TO service_role;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER ai_chat_updated_at BEFORE UPDATE ON public.ai_chat_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "ai_chat_own" ON public.ai_chat_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============== TRIGGER: cria profile + role no signup ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
