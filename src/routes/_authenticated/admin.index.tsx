import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { Button } from "@/components/ui/button";
import { LogOut, Users, BookOpen, CreditCard, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, signOut } = useAuth();

  // Fetch admin stats
  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [usersRes, coursesRes, enrollmentsRes, reviewsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalCourses: coursesRes.count || 0,
        totalEnrollments: enrollmentsRes.count || 0,
        totalReviews: reviewsRes.count || 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Navbar */}
      <nav className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
                A
              </div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
            </div>

            <div className="flex items-center gap-4">
              <AdminNotificationBell />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="mt-2 text-muted-foreground">Welcome to the admin panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="mt-2 text-3xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="mt-2 text-3xl font-bold">{stats?.totalCourses || 0}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enrollments</p>
                <p className="mt-2 text-3xl font-bold">{stats?.totalEnrollments || 0}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reviews</p>
                <p className="mt-2 text-3xl font-bold">{stats?.totalReviews || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="h-20 text-left justify-start">
              <div>
                <p className="font-medium">View All Users</p>
                <p className="text-xs text-muted-foreground">Manage user accounts and roles</p>
              </div>
            </Button>
            <Button variant="outline" className="h-20 text-left justify-start">
              <div>
                <p className="font-medium">View All Courses</p>
                <p className="text-xs text-muted-foreground">Manage courses and approvals</p>
              </div>
            </Button>
            <Button variant="outline" className="h-20 text-left justify-start">
              <div>
                <p className="font-medium">View Payments</p>
                <p className="text-xs text-muted-foreground">Monitor transactions and revenue</p>
              </div>
            </Button>
            <Button variant="outline" className="h-20 text-left justify-start">
              <div>
                <p className="font-medium">View Audit Logs</p>
                <p className="text-xs text-muted-foreground">Track admin actions</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>✅ Admin Panel Ready:</strong> The notification bell in the top right will show
            real-time notifications for new signups, courses, enrollments, and reviews. Click the
            bell icon to see all notifications.
          </p>
        </div>
      </div>
    </div>
  );
}
