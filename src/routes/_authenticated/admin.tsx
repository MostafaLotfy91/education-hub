import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // Get current user session
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    // If no session, redirect to login
    if (!userData.user || userError) {
      throw redirect({ to: "/auth" });
    }

    // Fetch user role from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    // If profile fetch fails or no profile, redirect to home (not logout)
    if (profileError || !profileData) {
      throw redirect({ to: "/" });
    }

    // If user is not admin, redirect to home (not logout)
    if (profileData.role !== "admin") {
      throw redirect({ to: "/" });
    }

    // User is authenticated and is an admin - allow access
    return {};
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();

  // Fetch user role with loading state
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["userRole", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .maybeSingle();

      if (error || !data) return null;
      return data.role;
    },
  });

  // Show loading state while role is being determined
  if (roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Double-check role is admin (should be caught by beforeLoad, but safety check)
  if (userRole !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
