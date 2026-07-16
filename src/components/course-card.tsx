import { Link } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";

type Course = Pick<
  Database["public"]["Tables"]["courses"]["Row"],
  "id" | "title" | "description" | "price" | "category" | "thumbnail_url"
>;

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      to="/course/$courseId"
      params={{ courseId: course.id }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:shadow-lg hover:border-primary/40"
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
            {course.title.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-primary">
          {course.category}
        </div>
        <h3 className="font-display text-base font-semibold leading-tight line-clamp-2">
          {course.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        <div className="mt-auto pt-2 text-lg font-bold">
          {course.price === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`}
        </div>
      </div>
    </Link>
  );
}
