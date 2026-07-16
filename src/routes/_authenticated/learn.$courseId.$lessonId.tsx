import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PlayCircle, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learn/$courseId/$lessonId")({
  component: LearnPage,
});

function LearnPage() {
  const { courseId, lessonId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["learn-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id,title").eq("id", courseId).maybeSingle();
      return data;
    },
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["learn-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id,title,order_index")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["learn-progress", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });

  const currentLesson = lessons.find((l) => l.id === lessonId);
  const completedSet = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));

  // Simulated playback
  const [playback, setPlayback] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const markedRef = useRef(false);

  useEffect(() => {
    setPlayback(0);
    setPlaying(false);
    markedRef.current = false;
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, [lessonId]);

  const markComplete = async () => {
    if (!user || markedRef.current) return;
    markedRef.current = true;
    const { error } = await supabase
      .from("lesson_progress")
      .upsert(
        { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" }
      );
    if (error) {
      markedRef.current = false;
      toast.error(error.message);
      return;
    }
    toast.success("Lesson marked complete");
    qc.invalidateQueries({ queryKey: ["learn-progress", courseId] });
  };

  useEffect(() => {
    if (!playing) return;
    timerRef.current = window.setInterval(() => {
      setPlayback((p) => {
        const next = Math.min(100, p + 2);
        if (next >= 95 && !markedRef.current) void markComplete();
        if (next >= 100) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPlaying(false);
        }
        return next;
      });
    }, 200);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const currentIdx = lessons.findIndex((l) => l.id === lessonId);
  const next = lessons[currentIdx + 1];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
      <div>
        <Link to="/course/$courseId" params={{ courseId }} className="text-sm text-muted-foreground hover:text-primary">
          ← Back to course
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {currentLesson ? `${currentLesson.order_index}. ${currentLesson.title}` : "Lesson"}
        </h1>

        {/* Placeholder video */}
        <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center relative">
          <div className="text-white/80 text-center px-6">
            <PlayCircle className="mx-auto h-16 w-16 opacity-70" />
            <p className="mt-3 text-sm opacity-80">Video placeholder — real hosting coming soon</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Progress value={playback} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Simulated playback: {playback}%</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
                {playing ? "Pause" : playback >= 100 ? "Replay" : "Play"}
              </Button>
              <Button size="sm" onClick={markComplete} disabled={completedSet.has(lessonId)}>
                {completedSet.has(lessonId) ? "Completed" : "Mark complete"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Lessons auto-complete once you reach 95% of playback.
          </p>
        </div>

        {next && (
          <div className="mt-6">
            <Link to="/learn/$courseId/$lessonId" params={{ courseId, lessonId: next.id }}>
              <Button variant="outline">Next lesson: {next.title} →</Button>
            </Link>
          </div>
        )}
      </div>

      <aside className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-sm font-medium text-muted-foreground">{course?.title}</div>
        <ul className="space-y-1">
          {lessons.map((l) => {
            const done = completedSet.has(l.id);
            const active = l.id === lessonId;
            return (
              <li key={l.id}>
                <Link
                  to="/learn/$courseId/$lessonId"
                  params={{ courseId, lessonId: l.id }}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <PlayCircle className="h-4 w-4 opacity-60" />
                  )}
                  <span className="truncate">{l.order_index}. {l.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
