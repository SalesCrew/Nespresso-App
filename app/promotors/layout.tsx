import SiteLayout from "../SiteLayout";
import { getCurrentUserAndProfile } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import { SocketProvider } from "@/lib/socket/SocketContext";
import TagesCheckProvider from "@/components/TagesCheckProvider";
import PromotorUnreadBridge from "@/components/promotors/PromotorUnreadBridge";
import { NotificationCenterProvider } from "@/lib/notifications/NotificationCenterContext";
import PromotorToastListener from "@/components/notifications/PromotorToastListener";
import PromotorNotificationStack from "@/components/notifications/PromotorNotificationStack";

interface PromotorLayoutProps {
  children: React.ReactNode;
}

export default async function PromotorLayout({ children }: PromotorLayoutProps) {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    redirect("/auth/promotors/login");
  }

  if (!profile) {
    redirect("/auth/promotors/login");
  }

  if (profile.role === "promotor") {
    return (
      <SiteLayout>
        <SocketProvider>
          <NotificationCenterProvider maxVisible={1}>
            <PromotorUnreadBridge />
            <PromotorToastListener currentUserId={user.id} />
            <PromotorNotificationStack />
          <TagesCheckProvider />
          {children}
          </NotificationCenterProvider>
        </SocketProvider>
      </SiteLayout>
    );
  }

  if (profile.role === "admin_of_admins" || profile.role === "admin_staff") {
    redirect("/admin/dashboard");
  }

  redirect("/");
  return null;
}
