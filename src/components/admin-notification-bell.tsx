import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminNotification {
  id: string;
  type: "user_signup" | "course_published" | "enrollment_completed" | "review_submitted";
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function AdminNotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["adminNotifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      return (data || []) as AdminNotification[];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("admin_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          // Invalidate query to refetch
          qc.invalidateQueries({ queryKey: ["adminNotifications"] });
          toast.success("New notification received");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      qc.invalidateQueries({ queryKey: ["adminNotifications"] });
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      qc.invalidateQueries({ queryKey: ["adminNotifications"] });
      toast.success("All notifications marked as read");
    }
  };

  const getNotificationIcon = (type: AdminNotification["type"]) => {
    switch (type) {
      case "user_signup":
        return "👤";
      case "course_published":
        return "📚";
      case "enrollment_completed":
        return "✅";
      case "review_submitted":
        return "⭐";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: AdminNotification["type"]) => {
    switch (type) {
      case "user_signup":
        return "bg-blue-50";
      case "course_published":
        return "bg-green-50";
      case "enrollment_completed":
        return "bg-purple-50";
      case "review_submitted":
        return "bg-yellow-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    !notification.is_read ? getNotificationColor(notification.type) : ""
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground break-words">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
