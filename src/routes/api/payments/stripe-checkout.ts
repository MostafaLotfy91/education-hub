import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

export const APIRoute = createAPIFileRoute("/api/payments/stripe-checkout")({
  POST: async ({ request }) => {
    try {
      const { courseId, userId, paymentId } = await request.json();

      if (!courseId || !userId || !paymentId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get course details
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, price_usd")
        .eq("id", courseId)
        .single();

      if (courseError || !course) {
        return new Response(JSON.stringify({ error: "Course not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        console.error("STRIPE_SECRET_KEY not configured");
        return new Response(JSON.stringify({ error: "Stripe not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create Stripe checkout session
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "payment_method_types[]": "card",
          "line_items[0][price_data][currency]": "usd",
          "line_items[0][price_data][unit_amount]": String(Math.round(course.price_usd * 100)),
          "line_items[0][quantity]": "1",
          "line_items[0][price_data][product_data][name]": course.title,
          "mode": "payment",
          "success_url": `${process.env.VITE_APP_URL}/course/${courseId}?payment=success`,
          "cancel_url": `${process.env.VITE_APP_URL}/course/${courseId}?payment=cancelled`,
          "metadata[user_id]": userId,
          "metadata[course_id]": courseId,
          "metadata[payment_id]": paymentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Stripe API error:", error);
        return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const session = await response.json();

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
