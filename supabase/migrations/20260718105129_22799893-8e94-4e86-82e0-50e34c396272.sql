-- Add admin role and user roles management
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin'));

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Create indexes for reviews
CREATE INDEX idx_reviews_course_id ON public.reviews(course_id);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Add trigger for updated_at on reviews table
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Grant permissions on reviews
GRANT SELECT ON public.reviews TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

-- Create function to get course average rating
CREATE OR REPLACE FUNCTION public.get_course_rating(p_course_id UUID)
RETURNS TABLE(average_rating NUMERIC, review_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::NUMERIC, 2) as average_rating,
    COUNT(*) as review_count
  FROM public.reviews
  WHERE course_id = p_course_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_course_rating(UUID) TO authenticated, anon;

-- Add search vector column to courses for full-text search
ALTER TABLE public.courses ADD COLUMN search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION public.update_course_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
CREATE TRIGGER trg_course_search_vector BEFORE INSERT OR UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.update_course_search_vector();

-- Create index for full-text search
CREATE INDEX idx_courses_search_vector ON public.courses USING gin(search_vector);

-- Add enrollment count column to courses (denormalized for performance)
ALTER TABLE public.courses ADD COLUMN enrollment_count INTEGER DEFAULT 0;

-- Create function to update enrollment count
CREATE OR REPLACE FUNCTION public.update_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses SET enrollment_count = enrollment_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses SET enrollment_count = enrollment_count - 1 WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for enrollment count
CREATE TRIGGER trg_update_enrollment_count AFTER INSERT OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_count();

-- Update existing enrollment counts
UPDATE public.courses SET enrollment_count = (
  SELECT COUNT(*) FROM public.enrollments WHERE course_id = courses.id
);

-- Grant permissions on profiles role column
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Create audit log table for admin actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit logs (admins only)
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Grant permissions on audit logs
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_changes JSONB
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (admin_id, action, table_name, record_id, changes)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_changes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, UUID, JSONB) TO service_role;
