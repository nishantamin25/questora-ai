
-- Add a column to store the correct answer for each question in the questions table
-- This will ensure each question has its admin-selected correct answer stored
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS admin_selected_answer integer;

-- Update existing questions to have a default correct answer if they don't have one
UPDATE public.questions 
SET admin_selected_answer = COALESCE(correct_answer, 0)
WHERE admin_selected_answer IS NULL;

-- Make sure admin_selected_answer is not null for future records
ALTER TABLE public.questions 
ALTER COLUMN admin_selected_answer SET NOT NULL;

-- Add a constraint to ensure admin_selected_answer is between 0 and 3 (for A, B, C, D)
ALTER TABLE public.questions 
ADD CONSTRAINT check_admin_selected_answer_range 
CHECK (admin_selected_answer >= 0 AND admin_selected_answer <= 3);
