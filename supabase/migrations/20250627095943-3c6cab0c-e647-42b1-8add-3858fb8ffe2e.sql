
-- Create enum types for better data consistency
CREATE TYPE public.question_type AS ENUM ('multiple-choice', 'text', 'boolean');
CREATE TYPE public.difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.user_role AS ENUM ('admin', 'guest');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'guest',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questionnaires table
CREATE TABLE public.questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  test_name TEXT NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  number_of_questions INTEGER NOT NULL DEFAULT 10,
  timeframe INTEGER NOT NULL DEFAULT 30, -- in minutes
  include_course BOOLEAN DEFAULT FALSE,
  include_questionnaire BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_saved BOOLEAN DEFAULT FALSE,
  set_number INTEGER DEFAULT 1,
  total_sets INTEGER DEFAULT 1,
  language TEXT DEFAULT 'en',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type question_type NOT NULL DEFAULT 'multiple-choice',
  options JSONB, -- Array of options for multiple choice questions
  correct_answer INTEGER, -- Index of correct answer for multiple choice
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  answers JSONB NOT NULL, -- Store all answers as JSON
  score INTEGER,
  total_questions INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table (for future course functionality)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for questionnaires
CREATE POLICY "Anyone can view active questionnaires" ON public.questionnaires
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create questionnaires" ON public.questionnaires
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own questionnaires" ON public.questionnaires
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own questionnaires" ON public.questionnaires
  FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for questions
CREATE POLICY "Anyone can view questions for active questionnaires" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires 
      WHERE id = questions.questionnaire_id AND is_active = true
    )
  );

CREATE POLICY "Questionnaire owners can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires 
      WHERE id = questions.questionnaire_id AND created_by = auth.uid()
    )
  );

-- Create RLS policies for responses
CREATE POLICY "Users can view their own responses" ON public.responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create responses" ON public.responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Questionnaire owners can view all responses" ON public.responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questionnaires 
      WHERE id = responses.questionnaire_id AND created_by = auth.uid()
    )
  );

-- Create RLS policies for courses
CREATE POLICY "Anyone can view courses" ON public.courses
  FOR SELECT TO authenticated;

CREATE POLICY "Authenticated users can create courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own courses" ON public.courses
  FOR DELETE USING (auth.uid() = created_by);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    'guest'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_questionnaires_active ON public.questionnaires(is_active);
CREATE INDEX idx_questionnaires_created_by ON public.questionnaires(created_by);
CREATE INDEX idx_questions_questionnaire_id ON public.questions(questionnaire_id);
CREATE INDEX idx_responses_questionnaire_id ON public.responses(questionnaire_id);
CREATE INDEX idx_responses_user_id ON public.responses(user_id);
CREATE INDEX idx_courses_created_by ON public.courses(created_by);
