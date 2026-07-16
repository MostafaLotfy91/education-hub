import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PlayCircle, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PaymentMethodModal } from "@/components/payment-method-modal";
import { getCoursePricing, getUserEmail } from "@/lib/payment-service";

export const Route = createFileRoute("/course/$courseId")({
  component: CourseDetail,
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pricing, setPricing] = useState<{ priceUsd: number; priceEgp: number }>({
    priceUsd: 0,
    priceEgp: 0,
  });
  const [userEmail, setUserEmail] = useState<string>("");

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, instructor:profiles!courses_instructor_id_fkey(full_name)")
        .eq("id", courseId)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id,title,order_index,is_preview")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Fetch pricing and user email
  useEffect(() => {
    if (courseId) {
      getCoursePricing(courseId).then(setPricing);
    }
    if (user?.id) {
      getUserEmail(user.id).then((email) => setUserEmail(email || ""));
    }
  }, [courseId, user?.id]);

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Course not found.
      </div>
    );
  }

  const enrolled = !!enrollment;

  const handleBuyNow = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setPaymentModalOpen(true);
  };

  return (
    <>
      <PaymentMethodModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        courseId={courseId}
        userId={user?.id || ""}
        userEmail={userEmail}
        courseTitle={course?.title || ""}
        priceUsd={pricing.priceUsd}
        priceEgp={pricing.priceEgp}
      />
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="text-xs font-medium uppercase tracking-wide text-primary">
                {course.category}
              </div>
              <h1 className="mt-2 font-display text-4xl font-bold">{course.title}</h1>
              <p className="mt-3 text-lg text-muted-foreground">{course.description}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Instructor:{" "}
                <span className="font-medium text-foreground">
                  {(course as any).instructor?.full_name ?? "Instructor"}
                </span>
              </p>

              <h2 className="mt-10 font-display text-2xl font-bold">Curriculum</h2>
              <ul className="mt-4 divide-y rounded-xl border bg-card">
                {lessons.map((l) => {
                  const unlocked = enrolled || l.is_preview;
                  return (
                    <li key={l.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {unlocked ? (
                          <PlayCircle className="h-5 w-5 text-primary" />
                        ) : (
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium">
                            {l.order_index}. {l.title}
                          </div>
                          {l.is_preview && !enrolled && (
                            <div className="text-xs text-primary">Free preview</div>
                          )}
                        </div>
                      </div>
                      {unlocked && (
                        <Link
                          to="/learn/$courseId/$lessonId"
                          params={{ courseId, lessonId: l.id }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {enrolled ? "Play" : "Preview"}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border bg-card p-6 shadow-sm">
                {course.thumbnail_url && (
                  <img
                    src={course.thumbnail_url}
                    alt=""
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="mt-1 space-y-1">
                    <div className="text-lg font-bold">
                      ${pricing.priceUsd.toFixed(2)} USD
                    </div>
                    <div className="text-sm text-muted-foreground">
                      or EGP {pricing.priceEgp.toFixed(2)}
                    </div>
                  </div>
                </div>
                {enrolled ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle2 className="h-4 w-4" /> You're enrolled
                    </div>
                    {lessons[0] && (
                      <Link
                        to="/learn/$courseId/$lessonId"
                        params={{ courseId, lessonId: lessons[0].id }}
                      >
                        <Button className="w-full" size="lg">
                          Continue learning
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <Button className="mt-4 w-full" size="lg" onClick={handleBuyNow}>
                    {user ? "Buy Now" : "Sign in to buy"}
                  </Button>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Choose your preferred payment method at checkout.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
