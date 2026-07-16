import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export function Navbar() {
  const { user, role, loading } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span>Hub</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/catalog" className="text-sm font-medium text-foreground/80 hover:text-primary">
            Browse
          </Link>
          {user && role === "student" && (
            <Link to="/my-courses" className="text-sm font-medium text-foreground/80 hover:text-primary">
              My Courses
            </Link>
          )}
          {user && role === "instructor" && (
            <>
              <Link to="/instructor" className="text-sm font-medium text-foreground/80 hover:text-primary">
                Dashboard
              </Link>
              <Link to="/instructor/courses/new" className="text-sm font-medium text-foreground/80 hover:text-primary">
                Create Course
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {role ?? "user"}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-16">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2 font-display font-bold">
            <GraduationCap className="h-5 w-5 text-primary" />
            Hub Education
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Hub Education. Learn something new every day.
          </p>
        </div>
      </div>
    </footer>
  );
}
