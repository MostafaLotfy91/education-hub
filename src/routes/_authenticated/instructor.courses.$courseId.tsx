import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/instructor/courses/$courseId")({
  component: ManageCourse,
});

function ManageCourse() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();

  const { data: course, refetch: refetchCourse } = useQuery({
    queryKey: ["manage-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: lessons = [], refetch: refetchLessons } = useQuery({
    queryKey: ["manage-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ title: "", description: "", price: "0", category: "", thumbnail_url: "", status: "draft" as "draft" | "published" });
  useEffect(() => {
    if (course) setForm({
      title: course.title,
      description: course.description ?? "",
      price: String(course.price),
      category: course.category,
      thumbnail_url: course.thumbnail_url ?? "",
      status: course.status,
    });
  }, [course]);

  const saveCourse = async () => {
    const { error } = await supabase.from("courses").update({
      title: form.title,
      description: form.description,
      price: Number(form.price) || 0,
      category: form.category,
      thumbnail_url: form.thumbnail_url || null,
      status: form.status,
    }).eq("id", courseId);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    refetchCourse();
  };

  const addLesson = async () => {
    const nextIdx = (lessons[lessons.length - 1]?.order_index ?? 0) + 1;
    const { error } = await supabase.from("lessons").insert({
      course_id: courseId, title: "New lesson", order_index: nextIdx,
    });
    if (error) { toast.error(error.message); return; }
    refetchLessons();
  };

  const updateLesson = async (id: string, patch: Partial<{ title: string; is_preview: boolean }>) => {
    const { error } = await supabase.from("lessons").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetchLessons();
  };

  const deleteLesson = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refetchLessons();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = lessons[idx];
    const b = lessons[idx + dir];
    if (!a || !b) return;
    await supabase.from("lessons").update({ order_index: b.order_index }).eq("id", a.id);
    await supabase.from("lessons").update({ order_index: a.order_index }).eq("id", b.id);
    refetchLessons();
  };

  if (!course) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link to="/instructor" className="text-sm text-muted-foreground hover:text-primary">← Back to dashboard</Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Manage course</h1>

      <section className="mt-6 rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold">Course details</h2>
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Price</Label><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        </div>
        <div><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
        <div className="flex items-center gap-3">
          <Switch checked={form.status === "published"} onCheckedChange={(v) => setForm({ ...form, status: v ? "published" : "draft" })} />
          <Label>Published</Label>
        </div>
        <Button onClick={saveCourse}>Save</Button>
      </section>

      <section className="mt-8 rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Lessons</h2>
          <Button size="sm" onClick={addLesson}>Add lesson</Button>
        </div>
        <ul className="mt-4 divide-y">
          {lessons.map((l, i) => (
            <li key={l.id} className="py-3 flex items-center gap-2">
              <div className="flex flex-col">
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === lessons.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              </div>
              <Input
                value={l.title}
                onChange={(e) => refetchLessons()} // no-op live; blur to save
                onBlur={(e) => e.target.value !== l.title && updateLesson(l.id, { title: e.target.value })}
                defaultValue={l.title}
                className="flex-1"
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={l.is_preview} onCheckedChange={(v) => updateLesson(l.id, { is_preview: v })} />
                Preview
              </label>
              <Button size="icon" variant="ghost" onClick={() => deleteLesson(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
          {lessons.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No lessons yet.</li>}
        </ul>
      </section>
    </div>
  );
}
