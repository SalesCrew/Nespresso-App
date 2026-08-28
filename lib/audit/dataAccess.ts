import { createSupabaseServiceClient } from "@/lib/supabase/service";

type AccessEvent = {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  subjectUserId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordDataAccess(event: AccessEvent): Promise<boolean> {
  const service = createSupabaseServiceClient();
  const { error } = await service.from("data_access_audit").insert({
    actor_user_id: event.actorUserId,
    action: event.action.slice(0, 100),
    resource_type: event.resourceType.slice(0, 100),
    resource_id: event.resourceId?.slice(0, 250) || null,
    subject_user_id: event.subjectUserId || null,
    metadata: event.metadata || {},
  });
  return !error;
}
