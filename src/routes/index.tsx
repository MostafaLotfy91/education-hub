import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { data: courses } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,description,price,category,thumbnail_url")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Learn from expert instructors
            </div>
            <h1 className="mt-4 font-display text-5xl font-bold leading-tight sm:text-6xl">
              Learn skills that <span className="text-primary">move you forward</span>.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Thousands of courses in tech, design, data, and business — taught by experts, at your own pace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/catalog"><Button size="lg">Browse courses</Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline">Become an instructor</Button></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> 50k+ students</div>
              <div className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-primary" /> 1,000+ lessons</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured courses */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Featured courses</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked to help you get started</p>
          </div>
          <Link to="/catalog" className="text-sm font-medium text-primary hover:underline">
            See all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses?.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary p-10 text-center text-primary-foreground sm:p-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to start learning?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Join for free and start your first course today. No credit card required.
          </p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg" variant="secondary">Create free account</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
