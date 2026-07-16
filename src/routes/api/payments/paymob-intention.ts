import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabase } from "@/integrations/supabase/client";

export const APIRoute = createAPIFileRoute("/api/payments/paymob-intention")({
  POST: async ({ request }) => {
    try {
      const { courseId, userId, paymentId, userEmail } = await request.json();

      if (!courseId || !userId || !paymentId || !userEmail) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Get course details
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, price_egp")
        .eq("id", courseId)
        .single();

      if (courseError || !course) {
        return new Response(JSON.stringify({ error: "Course not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const paymobApiKey = process.env.PAYMOB_API_KEY;
      if (!paymobApiKey) {
        console.error("PAYMOB_API_KEY not configured");
        return new Response(JSON.stringify({ error: "Paymob not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Convert EGP to piastres (minor units)
      const amountInPiastres = Math.round(course.price_egp * 100);

      // Create Paymob intention
      const response = await fetch("https://accept.paymob.com/v1/intention/", {
        method: "POST",
        headers: {
          "Authorization": `Token ${paymobApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInPiastres,
          currency: "EGP",
          payment_methods: ["card", "wallet", "aman"],
          items: [
            {
              name: course.title,
              amount: amountInPiastres,
              quantity: 1,
              description: `Course: ${course.title}`,
            },
          ],
          billing_data: {
            apartment: "NA",
            first_name: "Customer",
            last_name: "Name",
            street: "NA",
            building: "NA",
            phone_number: "+20100000000",
            city: "NA",
            state: "NA",
            country: "EG",
            email: userEmail,
            floor: "NA",
            postal_code: "NA",
          },
          customer: {
            first_name: "Customer",
            last_name: "Name",
            email: userEmail,
            phone_number: "+20100000000",
          },
          merchant_order_id: `${paymentId}:${userId}:${courseId}`,
          extras: {
            user_id: userId,
            course_id: courseId,
            payment_id: paymentId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Paymob API error:", error);
        return new Response(JSON.stringify({ error: "Failed to create payment intention" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const intention = await response.json();

      return new Response(JSON.stringify({ client_secret: intention.client_secret }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Paymob intention error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
