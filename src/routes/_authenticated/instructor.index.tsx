import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, DollarSign } from "lucide-react";

export const Route = createFileRoute("/_authenticated/instructor/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Instructor Dashboard — Hub" }] }),
});

function Dashboard() {
  const { user } = useAuth();

  const { data: courses = [] } = useQuery({
    queryKey: ["instructor-courses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,status,price,category,created_at")
        .eq("instructor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["instructor-enrollments", user?.id, courses.map((c) => c.id).join(",")],
    enabled: !!user && courses.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courses.map((c) => c.id));
      return data ?? [];
    },
  });

  const totalEnrollments = enrollments.length;
  const earnings = courses.reduce((sum, c) => {
    const count = enrollments.filter((e) => e.course_id === c.id).length;
    return sum + count * Number(c.price);
  }, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Instructor Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage your courses and track performance</p>
        </div>
        <Link to="/instructor/courses/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New course</Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses" value={courses.length} />
        <StatCard label="Total enrollments" value={totalEnrollments} icon={<Users className="h-5 w-5 text-primary" />} />
        <StatCard label="Est. earnings" value={`$${earnings.toFixed(2)}`} icon={<DollarSign className="h-5 w-5 text-primary" />} />
      </div>

      <h2 className="mt-12 font-display text-2xl font-bold">Your courses</h2>
      {courses.length === 0 ? (
        <div className="mt-4 rounded-xl border bg-card p-8 text-center text-muted-foreground">
          You haven't created any courses yet.{" "}
          <Link to="/instructor/courses/new" className="text-primary underline">Create your first</Link>.
        </div>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border bg-card">
          {courses.map((c) => {
            const count = enrollments.filter((e) => e.course_id === c.id).length;
            return (
              <li key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.title}</span>
                    <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.category} · ${Number(c.price).toFixed(2)} · {count} enrollment{count === 1 ? "" : "s"}
                  </div>
                </div>
                <Link to="/instructor/courses/$courseId" params={{ courseId: c.id }}>
                  <Button variant="outline" size="sm">Manage</Button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        {icon}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
