import { getCurrentUserAndProfile } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { SocketProvider } from "@/lib/socket/SocketContext";
import { NotificationCenterProvider } from "@/lib/notifications/NotificationCenterContext";
import AdminNotificationStack from "@/components/notifications/AdminNotificationStack";
import AdminToastListener from "@/components/notifications/AdminToastListener";
import AdminTooltipAuto from "@/components/ux/AdminTooltipAuto";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/auth/salescrew/login");
  }

  if (!profile) {
    redirect("/auth/salescrew/login");
  }

  // Only admins may access admin routes
  if (profile.role === "admin_of_admins" || profile.role === "admin_staff") {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <SocketProvider>
          <NotificationCenterProvider>
            <AdminTooltipAuto delayMs={2000} />
            <AdminToastListener currentUserId={user.id} />
            <AdminNotificationStack />
            {children}
          </NotificationCenterProvider>
        </SocketProvider>
      </div>
    );
  }

  // Known non-admin (promotor) → send to promotor dashboard; others go home
  if (profile.role === "promotor") {
    redirect("/promotors/dashboard");
  }
  redirect("/");
  return null;
}
