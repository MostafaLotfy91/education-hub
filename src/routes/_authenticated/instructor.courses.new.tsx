import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/instructor/courses/new")({
  component: NewCourse,
  head: () => ({ meta: [{ title: "New course — Hub" }] }),
});

function NewCourse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "0",
    category: "General",
    thumbnail_url: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("courses")
      .insert({
        instructor_id: user.id,
        title: form.title,
        description: form.description,
        price: Number(form.price) || 0,
        category: form.category || "General",
        thumbnail_url: form.thumbnail_url || null,
        status: "draft",
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Course created");
    navigate({ to: "/instructor/courses/$courseId", params: { courseId: data.id } });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Create a new course</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Price (USD)</Label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Thumbnail URL (optional)</Label>
          <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
        </div>
        <Button type="submit" disabled={busy}>Create course</Button>
      </form>
    </div>
  );
}
