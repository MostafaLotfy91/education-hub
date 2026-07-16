import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/course-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const Route = createFileRoute("/catalog")({
  component: Catalog,
  head: () => ({
    meta: [
      { title: "Browse courses — Hub Education" },
      { name: "description", content: "Explore all published courses on Hub Education." },
    ],
  }),
});

function Catalog() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,description,price,category,thumbnail_url")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = Array.from(new Set(courses.map((c) => c.category)));
  const filtered = courses.filter((c) => {
    if (category && c.category !== category) return false;
    if (q && !`${c.title} ${c.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold">All courses</h1>
      <p className="mt-1 text-muted-foreground">Find your next skill.</p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === null ? "default" : "outline"}
          onClick={() => setCategory(null)}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? "default" : "outline"}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          No courses match your search. <Link to="/catalog" className="text-primary underline">Reset</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}
