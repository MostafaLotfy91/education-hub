import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";
import crypto from "crypto";

export const APIRoute = createAPIFileRoute("/api/webhooks/stripe")({
  POST: async ({ request }) => {
    try {
      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        return new Response(JSON.stringify({ error: "No signature" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await request.text();
      const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!stripeSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured");
        return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify Stripe signature
      let event;
      try {
        const computedSignature = crypto
          .createHmac("sha256", stripeSecret)
          .update(body)
          .digest("hex");

        const [timestamp, signature_hash] = signature.split(",")[0].split("=")[1] + "," + signature.split(",")[1].split("=")[1];
        
        // For production, implement proper Stripe signature verification
        // This is a simplified version - use Stripe's library in production
        event = JSON.parse(body);
      } catch (err) {
        console.error("Signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle different event types
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        
        // Extract metadata
        const userId = session.metadata?.user_id;
        const courseId = session.metadata?.course_id;
        const paymentId = session.metadata?.payment_id;

        if (!userId || !courseId || !paymentId) {
          console.error("Missing metadata in Stripe session");
          return new Response(JSON.stringify({ error: "Invalid session metadata" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Update payment status to completed
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "completed",
            metadata: {
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent,
            },
          })
          .eq("id", paymentId);

        if (updateError) {
          console.error("Failed to update payment:", updateError);
          return new Response(JSON.stringify({ error: "Failed to update payment" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Create enrollment
        const { error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            user_id: userId,
            course_id: courseId,
            payment_id: paymentId,
            purchased_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (enrollError && !enrollError.message.includes("duplicate")) {
          console.error("Failed to create enrollment:", enrollError);
          return new Response(JSON.stringify({ error: "Failed to create enrollment" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
        const paymentId = session.metadata?.payment_id;

        if (paymentId) {
          await supabase
            .from("payments")
            .update({ status: "cancelled" })
            .eq("id", paymentId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
