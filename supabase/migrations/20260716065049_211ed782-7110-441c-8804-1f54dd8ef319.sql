-- Fix the foreign key constraint for courses.instructor_id
-- Change from pointing to auth.users(id) to profiles(id)
-- This enables proper PostgREST relationship queries

-- Step 1: Drop the old foreign key constraint
ALTER TABLE public.courses
DROP CONSTRAINT courses_instructor_id_fkey;

-- Step 2: Add the new foreign key constraint pointing to profiles(id)
ALTER TABLE public.courses
ADD CONSTRAINT courses_instructor_id_fkey
FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
