
-- Add video_url column to courses table
ALTER TABLE public.courses 
ADD COLUMN video_url TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN public.courses.video_url IS 'YouTube or Google Drive URL for course video content';
