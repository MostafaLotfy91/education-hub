import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";
import crypto from "crypto";

export const APIRoute = createAPIFileRoute("/api/webhooks/paymob")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();

      // Paymob webhook structure
      const {
        type,
        obj: {
          id: paymob_order_id,
          merchant_order_id,
          amount_cents,
          currency,
          success,
          is_auth,
          is_capture,
          is_standalone_payment,
          order_id,
        },
      } = body;

      // Verify Paymob HMAC signature
      const paymobSecret = process.env.PAYMOB_HMAC_SECRET;
      if (!paymobSecret) {
        console.error("PAYMOB_HMAC_SECRET not configured");
        return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify signature (Paymob sends HMAC in header)
      const hmacHeader = request.headers.get("x-paymob-hmac");
      if (hmacHeader) {
        const computedHmac = crypto
          .createHmac("sha512", paymobSecret)
          .update(JSON.stringify(body))
          .digest("hex");

        if (computedHmac !== hmacHeader) {
          console.error("Invalid Paymob HMAC signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Extract payment ID from merchant_order_id (format: "payment_id:user_id:course_id")
      const [paymentId, userId, courseId] = merchant_order_id.split(":");

      if (!paymentId || !userId || !courseId) {
        console.error("Invalid merchant_order_id format");
        return new Response(JSON.stringify({ error: "Invalid merchant_order_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle payment completion
      if (type === "TRANSACTION" && success) {
        // Update payment status to completed
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "completed",
            metadata: {
              paymob_order_id,
              paymob_transaction_id: paymob_order_id,
              is_auth,
              is_capture,
              is_standalone_payment,
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

      // Handle payment failure
      if (type === "TRANSACTION" && !success) {
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "failed",
            metadata: {
              paymob_order_id,
              failure_reason: "Payment declined",
            },
          })
          .eq("id", paymentId);

        if (updateError) {
          console.error("Failed to update failed payment:", updateError);
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Paymob webhook error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
