import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/my-courses")({
  component: MyCourses,
  head: () => ({ meta: [{ title: "My Courses — Hub Education" }] }),
});

function MyCourses() {
  const { user } = useAuth();

  const { data: rows = [] } = useQuery({
    queryKey: ["my-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, courses(id,title,description,thumbnail_url,category)")
        .eq("user_id", user!.id)
        .order("purchased_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const courseIds = rows.map((r) => r.course_id);

  const { data: progressData = [] } = useQuery({
    queryKey: ["my-progress", user?.id, courseIds.join(",")],
    enabled: !!user && courseIds.length > 0,
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, course_id")
        .in("course_id", courseIds);
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id)
        .eq("completed", true);
      const completedSet = new Set((progress ?? []).map((p) => p.lesson_id));
      return courseIds.map((cid) => {
        const total = (lessons ?? []).filter((l) => l.course_id === cid).length;
        const done = (lessons ?? []).filter((l) => l.course_id === cid && completedSet.has(l.id)).length;
        return { courseId: cid, total, done };
      });
    },
  });

  if (!rows.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">No courses yet</h1>
        <p className="mt-2 text-muted-foreground">Browse the catalog and enroll to get started.</p>
        <Link to="/catalog" className="mt-6 inline-block">
          <Button>Browse courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold">My courses</h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const course = r.courses as any;
          if (!course) return null;
          const p = progressData.find((x) => x.courseId === r.course_id);
          const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Link
              key={r.course_id}
              to="/course/$courseId"
              params={{ courseId: r.course_id }}
              className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg transition"
            >
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />
              )}
              <div className="p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-primary">{course.category}</div>
                <h3 className="mt-1 font-semibold line-clamp-2">{course.title}</h3>
                <div className="mt-3 space-y-1">
                  <Progress value={pct} />
                  <div className="text-xs text-muted-foreground">{pct}% complete ({p?.done ?? 0}/{p?.total ?? 0})</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
