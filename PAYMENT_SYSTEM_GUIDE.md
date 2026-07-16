# Dual Payment System Implementation Guide

## Overview

This document describes the implementation of a dual payment system supporting both **Stripe** (international/USD) and **Paymob** (Egypt/EGP) for course enrollment.

## Architecture

### Payment Flow

```
User clicks "Buy Now"
    ↓
Payment Method Modal Opens
    ├─→ Stripe (International - USD)
    │   ├─→ Create payment record (pending)
    │   ├─→ Create Stripe checkout session
    │   ├─→ Redirect to Stripe-hosted checkout
    │   ├─→ Stripe webhook confirms payment
    │   └─→ Enrollment created + payment marked completed
    │
    └─→ Paymob (Egypt - EGP)
        ├─→ Create payment record (pending)
        ├─→ Create Paymob intention
        ├─→ Mount Paymob checkout button
        ├─→ Paymob webhook confirms payment
        └─→ Enrollment created + payment marked completed
```

## Database Schema

### New Tables & Columns

#### `payments` Table
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  payment_provider TEXT ('stripe' | 'paymob'),
  provider_payment_id TEXT UNIQUE,
  amount NUMERIC(10,2),
  currency TEXT ('USD' | 'EGP'),
  status TEXT ('pending' | 'completed' | 'failed' | 'cancelled'),
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `courses` Table (Updated)
```sql
ALTER TABLE courses ADD COLUMN price_egp NUMERIC(10,2);
```

#### `enrollments` Table (Updated)
```sql
ALTER TABLE enrollments ADD COLUMN payment_id UUID REFERENCES payments(id);
ALTER TABLE enrollments ADD COLUMN price_paid NUMERIC(10,2);
ALTER TABLE enrollments ADD COLUMN currency TEXT;
```

## API Endpoints

### 1. Stripe Checkout Session
**POST** `/api/payments/stripe-checkout`

Request:
```json
{
  "courseId": "uuid",
  "userId": "uuid",
  "paymentId": "uuid"
}
```

Response:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### 2. Paymob Payment Intention
**POST** `/api/payments/paymob-intention`

Request:
```json
{
  "courseId": "uuid",
  "userId": "uuid",
  "paymentId": "uuid",
  "userEmail": "user@example.com"
}
```

Response:
```json
{
  "client_secret": "intent_secret_..."
}
```

### 3. Stripe Webhook
**POST** `/api/webhooks/stripe`

Handles events:
- `checkout.session.completed` → Mark payment as completed, create enrollment
- `checkout.session.expired` → Mark payment as cancelled

### 4. Paymob Webhook
**POST** `/api/webhooks/paymob`

Handles events:
- `TRANSACTION` with `success: true` → Mark payment as completed, create enrollment
- `TRANSACTION` with `success: false` → Mark payment as failed

## Environment Variables

Required secrets (add to `.env` or secrets manager):

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paymob
PAYMOB_API_KEY=...
PAYMOB_HMAC_SECRET=...

# App URL (for Stripe success/cancel redirects)
VITE_APP_URL=https://yourdomain.com
```

## Frontend Components

### PaymentMethodModal
Located: `src/components/payment-method-modal.tsx`

Displays two payment options:
1. **Stripe** - International card payments (USD)
2. **Paymob** - Egypt-specific payments (EGP, cards, wallets)

Props:
```typescript
interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  userId: string;
  userEmail: string;
  courseTitle: string;
  priceUsd: number;
  priceEgp: number;
  onPaymentInitiated?: (provider: "stripe" | "paymob", result: any) => void;
}
```

## Payment Service Functions

Located: `src/lib/payment-service.ts`

### Key Functions

#### `initiateStripePayment(userId, courseId, userEmail)`
- Creates payment record in database
- Calls `/api/payments/stripe-checkout`
- Returns redirect URL for Stripe checkout

#### `initiatePaymobPayment(userId, courseId, userEmail)`
- Creates payment record in database
- Calls `/api/payments/paymob-intention`
- Returns client secret for Paymob checkout

#### `getCoursePricing(courseId)`
- Fetches `price_usd` and `price_egp` from course

#### `checkEnrollment(userId, courseId)`
- Checks if user is already enrolled

## Webhook Signature Verification

### Stripe
```typescript
// Verify using Stripe's library (recommended for production)
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

### Paymob
```typescript
// Verify HMAC signature
const hmac = crypto
  .createHmac('sha512', paymobSecret)
  .update(JSON.stringify(body))
  .digest('hex');

if (hmac !== request.headers['x-paymob-hmac']) {
  throw new Error('Invalid signature');
}
```

## Security Rules

1. **Never create enrollments from frontend** - Only verified webhooks can create enrollments
2. **Store secrets in environment variables** - Never hardcode API keys
3. **Verify all webhook signatures** - Prevent unauthorized payment confirmations
4. **Use HTTPS** - All payment communication must be encrypted
5. **Validate payment amounts** - Ensure amount matches course price before processing

## Testing

### Test Credentials

#### Stripe (Sandbox)
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

#### Paymob (Sandbox)
- Use Paymob's test credentials
- Available in Paymob dashboard

### Test Flow

1. Go to course detail page
2. Click "Buy Now"
3. Select payment method
4. Complete payment with test credentials
5. Verify:
   - Payment record created with status "pending"
   - Webhook received and verified
   - Payment status updated to "completed"
   - Enrollment created automatically
   - User can access course

## Deployment Checklist

- [ ] Database migrations applied (`supabase db push`)
- [ ] Environment variables configured in production
- [ ] Webhook URLs registered in Stripe dashboard
- [ ] Webhook URLs registered in Paymob dashboard
- [ ] HTTPS enabled on webhook endpoints
- [ ] Test payment flow end-to-end
- [ ] Monitor webhook logs for errors
- [ ] Set up alerts for failed payments

## Troubleshooting

### Payment Record Not Created
- Check user authentication
- Verify course exists and has pricing

### Webhook Not Received
- Verify webhook URL is publicly accessible
- Check firewall/security group rules
- Verify webhook is registered in provider dashboard
- Check provider logs for delivery attempts

### Signature Verification Failed
- Verify webhook secret is correct
- Ensure request body is not modified before verification
- Check timestamp (Stripe webhooks expire after 5 minutes)

### Enrollment Not Created
- Verify payment status is "completed"
- Check user and course IDs in payment metadata
- Verify database permissions for service role
- Check for duplicate enrollment conflicts

## File Structure

```
src/
├── routes/
│   ├── api/
│   │   ├── payments/
│   │   │   ├── stripe-checkout.ts
│   │   │   └── paymob-intention.ts
│   │   └── webhooks/
│   │       ├── stripe.ts
│   │       └── paymob.ts
│   └── course.$courseId.tsx (updated)
├── components/
│   └── payment-method-modal.tsx
├── lib/
│   └── payment-service.ts
└── supabase/
    └── migrations/
        └── 20260716073028_*.sql
```

## Future Enhancements

1. **Payment History** - User dashboard showing all payments
2. **Refunds** - Implement refund processing for both providers
3. **Subscription** - Recurring billing for course bundles
4. **Analytics** - Track payment metrics and conversion rates
5. **Multiple Currencies** - Support additional currencies beyond USD/EGP
6. **Retry Logic** - Automatic retry for failed payments
7. **Email Receipts** - Send payment receipts to users

## Support

For issues or questions:
1. Check webhook logs in provider dashboards
2. Review database payment records
3. Check browser console for client-side errors
4. Review server logs for API errors
