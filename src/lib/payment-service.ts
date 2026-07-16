import { supabase } from "@/integrations/supabase/client";

export type PaymentProvider = "stripe" | "paymob";

export interface CreatePaymentParams {
  userId: string;
  courseId: string;
  provider: PaymentProvider;
  amount: number;
  currency: "USD" | "EGP";
}

export interface PaymentResult {
  success: boolean;
  error?: string;
  paymentId?: string;
  redirectUrl?: string;
  clientSecret?: string;
}

/**
 * Create a payment record in the database
 */
export async function createPaymentRecord(
  params: CreatePaymentParams
): Promise<{ id: string; error?: string }> {
  const { userId, courseId, provider, amount, currency } = params;

  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      course_id: courseId,
      payment_provider: provider,
      provider_payment_id: `${provider}_pending_${Date.now()}`, // Temporary ID, will be updated by webhook
      amount,
      currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create payment record:", error);
    return { id: "", error: error.message };
  }

  return { id: data.id };
}

/**
 * Initiate Stripe payment
 */
export async function initiateStripePayment(
  userId: string,
  courseId: string,
  userEmail: string
): Promise<PaymentResult> {
  try {
    // Create payment record
    const { id: paymentId, error: paymentError } = await createPaymentRecord({
      userId,
      courseId,
      provider: "stripe",
      amount: 0, // Will be fetched from course
      currency: "USD",
    });

    if (paymentError || !paymentId) {
      return { success: false, error: "Failed to create payment record" };
    }

    // Create Stripe checkout session
    const response = await fetch("/api/payments/stripe-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        userId,
        paymentId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to create checkout session" };
    }

    const { url } = await response.json();

    return {
      success: true,
      paymentId,
      redirectUrl: url,
    };
  } catch (error) {
    console.error("Stripe payment error:", error);
    return { success: false, error: "Failed to initiate payment" };
  }
}

/**
 * Initiate Paymob payment
 */
export async function initiatePaymobPayment(
  userId: string,
  courseId: string,
  userEmail: string
): Promise<PaymentResult> {
  try {
    // Create payment record
    const { id: paymentId, error: paymentError } = await createPaymentRecord({
      userId,
      courseId,
      provider: "paymob",
      amount: 0, // Will be fetched from course
      currency: "EGP",
    });

    if (paymentError || !paymentId) {
      return { success: false, error: "Failed to create payment record" };
    }

    // Create Paymob intention
    const response = await fetch("/api/payments/paymob-intention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        userId,
        paymentId,
        userEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to create payment intention" };
    }

    const { client_secret } = await response.json();

    return {
      success: true,
      paymentId,
      clientSecret: client_secret,
    };
  } catch (error) {
    console.error("Paymob payment error:", error);
    return { success: false, error: "Failed to initiate payment" };
  }
}

/**
 * Get course pricing
 */
export async function getCoursePricing(courseId: string): Promise<{
  priceUsd: number;
  priceEgp: number;
  error?: string;
}> {
  const { data, error } = await supabase
    .from("courses")
    .select("price_usd:price, price_egp")
    .eq("id", courseId)
    .single();

  if (error || !data) {
    return { priceUsd: 0, priceEgp: 0, error: "Course not found" };
  }

  return {
    priceUsd: data.price_usd || 0,
    priceEgp: data.price_egp || 0,
  };
}

/**
 * Check if user is already enrolled
 */
export async function checkEnrollment(userId: string, courseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single();

  return !error && !!data;
}

/**
 * Get user email
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.email;
}
