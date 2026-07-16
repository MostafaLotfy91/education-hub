import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Hub Education" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/catalog" });
  }, [user, loading, navigate]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="text-center font-display text-2xl font-bold">Welcome to Hub</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in or create an account</p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin"><SignInForm /></TabsContent>
          <TabsContent value="signup"><SignUpForm /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed in");
    navigate({ to: "/catalog" });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="si-password">Password</Label>
        <Input id="si-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
    </form>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — you're signed in!");
    navigate({ to: role === "instructor" ? "/instructor" : "/catalog" });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="su-name">Full name</Label>
        <Input id="su-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div>
        <Label>I want to</Label>
        <RadioGroup value={role} onValueChange={(v) => setRole(v as "student" | "instructor")} className="mt-2 grid grid-cols-2 gap-2">
          <label className={`cursor-pointer rounded-lg border p-3 text-sm ${role === "student" ? "border-primary bg-primary/5" : ""}`}>
            <RadioGroupItem value="student" className="sr-only" />
            <div className="font-medium">Learn</div>
            <div className="text-xs text-muted-foreground">I'm a student</div>
          </label>
          <label className={`cursor-pointer rounded-lg border p-3 text-sm ${role === "instructor" ? "border-primary bg-primary/5" : ""}`}>
            <RadioGroupItem value="instructor" className="sr-only" />
            <div className="font-medium">Teach</div>
            <div className="text-xs text-muted-foreground">I'm an instructor</div>
          </label>
        </RadioGroup>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
    </form>
  );
}
