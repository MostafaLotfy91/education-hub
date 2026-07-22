# Payment System Setup - Step by Step Guide

## Overview
We need to:
1. Apply database changes to Supabase
2. Add pricing to your courses
3. Configure payment provider credentials
4. Test the payment system

---

## STEP 1: Apply Database Migration (5 minutes)

### What is this?
This adds the payment tables and columns to your Supabase database.

### How to do it:

**A) Open Supabase Dashboard**
1. Go to: https://app.supabase.com
2. Click on your project: `education-hub`
3. On the left sidebar, click **"SQL Editor"**

**B) Create a New Query**
1. Click the **"New Query"** button (top right)
2. You'll see a blank SQL editor

**C) Copy the Migration SQL**
1. Copy ALL the text below:

```sql
-- Add price_egp column to courses table
ALTER TABLE public.courses
ADD COLUMN price_egp NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Create payments table to track all payments
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

-- Update enrollments table to track payment info
ALTER TABLE public.enrollments
ADD COLUMN payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
ADD COLUMN price_paid NUMERIC(10,2),
ADD COLUMN currency TEXT;

-- Create indexes for faster queries
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_course_id ON public.payments(course_id);
CREATE INDEX idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_enrollments_payment_id ON public.enrollments(payment_id);

-- Add trigger for updated_at on payments table
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT SELECT, UPDATE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manage all payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create a function to handle payment completion and enrollment creation
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
    RETURN true;
  END IF;
  
  -- Create enrollment
  INSERT INTO enrollments (user_id, course_id, payment_id, purchased_at)
  VALUES (p_user_id, p_course_id, p_payment_id, now())
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RETURN true;
END; $$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.complete_payment_and_enroll(UUID, UUID, UUID) TO service_role;
```

**D) Paste into SQL Editor**
1. Click in the SQL editor (the white area)
2. Press `Ctrl+A` to select all (if there's existing text)
3. Paste the SQL you copied

**E) Run the Query**
1. Click the **"Run"** button (or press `Ctrl+Enter`)
2. Wait for it to complete (should say "Success" at the bottom)

✅ **If you see "Success"** - Great! The database is updated.
❌ **If you see an error** - Let me know what the error says.

---

## STEP 2: Add Course Pricing (2 minutes)

### What is this?
We need to set prices for your courses in both USD (for Stripe) and EGP (for Paymob).

### How to do it:

**A) Find Your Course ID**
1. In Supabase, go to **"Table Editor"** (left sidebar)
2. Click on **"courses"** table
3. Find your course (e.g., "Modern Web Development with React")
4. Copy the `id` (it's a long code like `11111111-1111-1111-1111-111111111111`)

**B) Update the Pricing**
1. Go back to **"SQL Editor"**
2. Click **"New Query"**
3. Paste this (replace the IDs and prices):

```sql
UPDATE courses 
SET price_usd = 49.99, price_egp = 1499.00
WHERE id = '11111111-1111-1111-1111-111111111111';
```

4. Click **"Run"**

**C) Verify**
1. Go to **"Table Editor"**
2. Click **"courses"**
3. You should see `price_usd` and `price_egp` columns with your prices

---

## STEP 3: Configure Environment Variables (5 minutes)

### What is this?
These are secret keys for Stripe and Paymob. They're like passwords that let your app talk to these payment services.

### For Testing (Use these test credentials):

**A) Get Stripe Test Keys**
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy the **"Secret key"** (starts with `sk_test_`)
3. Copy the **"Publishable key"** (starts with `pk_test_`)

**B) Get Paymob Test Keys**
1. Go to: https://accept.paymob.com/account/settings
2. Find your **API Key**
3. Find your **HMAC Secret**

**C) Add to Your Project**

If you're using **Vercel** or similar hosting:
1. Go to your project settings
2. Find **"Environment Variables"**
3. Add these:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMOB_API_KEY=...
PAYMOB_HMAC_SECRET=...
VITE_APP_URL=https://yourdomain.com
```

If you're using **local development**:
1. Create a `.env.local` file in your project root
2. Add the same variables

---

## STEP 4: Test the Payment System (10 minutes)

### What is this?
We'll test that everything works end-to-end.

### How to test:

**A) Start Your App**
```bash
cd /home/ubuntu/education-hub
npm run dev
```

**B) Open in Browser**
1. Go to: http://localhost:5173
2. Sign in with your account
3. Click on a course
4. Click **"Buy Now"** button

**C) You Should See**
- A modal with two payment options:
  - 💳 **Stripe** (International - USD)
  - 💰 **Paymob** (Egypt - EGP)

**D) Test Stripe Payment**
1. Click **"Pay with Card (International)"**
2. Use test card: `4242 4242 4242 4242`
3. Expiry: Any future date (e.g., 12/25)
4. CVC: Any 3 digits (e.g., 123)
5. Click **"Pay"**

**E) Check if Payment Worked**
1. Go to Supabase **"Table Editor"**
2. Click **"payments"** table
3. You should see a new payment record with:
   - `status`: "pending" (or "completed" if webhook worked)
   - `payment_provider`: "stripe"
   - `amount`: 49.99
   - `currency`: "USD"

**F) Test Paymob Payment**
1. Go back to the course page
2. Click **"Buy Now"** again
3. Click **"Pay with Paymob (Egypt)"**
4. Use Paymob test credentials
5. Check the `payments` table again

---

## STEP 5: Verify Everything is Working (5 minutes)

### Checklist:

- [ ] Database migration applied successfully
- [ ] Course pricing set (price_usd and price_egp)
- [ ] Environment variables configured
- [ ] App starts without errors
- [ ] "Buy Now" button shows payment modal
- [ ] Can select Stripe or Paymob option
- [ ] Payment record created in database
- [ ] Can see payment status in Supabase

---

## Troubleshooting

### "Buy Now" button doesn't appear
- Make sure you're signed in
- Check browser console for errors (F12)

### Payment modal doesn't open
- Check that environment variables are set
- Refresh the page

### Payment record not created
- Check browser console for errors
- Check that course has pricing set

### Webhook not received
- For testing, webhooks won't work until you set up ngrok or similar
- For now, you can manually update payment status in Supabase

---

## Next Steps

Once everything is working:
1. Switch to production credentials (not test)
2. Set up webhook URLs in Stripe and Paymob dashboards
3. Deploy to production
4. Monitor payment flows

---

## Need Help?

If you get stuck at any step, let me know:
1. Which step you're on
2. What error you see (if any)
3. A screenshot if possible

I'm here to help! 🎉
