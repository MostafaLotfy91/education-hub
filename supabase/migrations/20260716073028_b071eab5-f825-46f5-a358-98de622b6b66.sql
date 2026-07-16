-- Add payment system tables and columns for Stripe and Paymob integration

-- Step 1: Add price_egp column to courses table
ALTER TABLE public.courses
ADD COLUMN price_egp NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Step 2: Create payments table to track all payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'paymob')),
  provider_payment_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USD', 'EGP')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Update enrollments table to track payment info
ALTER TABLE public.enrollments
ADD COLUMN payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
ADD COLUMN price_paid NUMERIC(10,2),
ADD COLUMN currency TEXT;

-- Step 4: Create indexes for faster queries
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_course_id ON public.payments(course_id);
CREATE INDEX idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_enrollments_payment_id ON public.enrollments(payment_id);

-- Step 5: Add trigger for updated_at on payments table
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT SELECT, UPDATE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;

-- Step 7: Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for payments
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manage all payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Step 9: Create a function to handle payment completion and enrollment creation
CREATE OR REPLACE FUNCTION public.complete_payment_and_enroll(
  p_payment_id UUID,
  p_user_id UUID,
  p_course_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_payment_status TEXT;
  v_enrollment_exists BOOLEAN;
BEGIN
  -- Check if payment exists and is completed
  SELECT status INTO v_payment_status FROM payments WHERE id = p_payment_id;
  
  IF v_payment_status IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  
  IF v_payment_status != 'completed' THEN
    RAISE EXCEPTION 'Payment is not completed';
  END IF;
  
  -- Check if enrollment already exists
  SELECT EXISTS(SELECT 1 FROM enrollments WHERE user_id = p_user_id AND course_id = p_course_id)
  INTO v_enrollment_exists;
  
  IF v_enrollment_exists THEN
    RETURN true; -- Already enrolled, no need to create duplicate
  END IF;
  
  -- Create enrollment
  INSERT INTO enrollments (user_id, course_id, payment_id, purchased_at)
  VALUES (p_user_id, p_course_id, p_payment_id, now())
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RETURN true;
END; $$;

-- Step 10: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.complete_payment_and_enroll(UUID, UUID, UUID) TO service_role;
