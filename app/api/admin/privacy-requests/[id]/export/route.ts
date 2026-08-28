import { NextResponse } from "next/server";

import { recordDataAccess } from "@/lib/audit/dataAccess";
import { requireAdmin } from "@/lib/auth/routeGuards";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: requestId } = await params;
  const service = createSupabaseServiceClient();
  const { data: privacyRequest } = await service
    .from("privacy_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!privacyRequest) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!privacyRequest.identity_verified_at) {
    return NextResponse.json({ error: "identity must be verified first" }, { status: 409 });
  }

  const userId = String(privacyRequest.subject_user_id);
  const { data: authUserResult } = await service.auth.admin.getUserById(userId);
  const [userProfileResult, promotorProfileResult, documentsResult, contractFilesResult, credentialsResult,
    participationsResult, dailyCheckinsResult, specialRequestsResult, activeStatusResult, onboardingResult,
    kpiFeedbackResult, kpiBonusesResult, todosResult, ownChatMessagesResult, chatParticipationResult,
    reactionsResult, messageRecipientsResult] = await Promise.all([
    service.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
    service.from("promotor_profiles").select("*").eq("user_id", userId).maybeSingle(),
    service.from("documents").select("id, doc_type, status, created_at, updated_at").eq("user_id", userId),
    service.from("dienstvertrag_files").select("id, file_name, mime_type, file_ext, is_active, created_at, updated_at").eq("user_id", userId),
    service.from("access_credentials").select("*").eq("user_id", userId).maybeSingle(),
    service.from("assignment_participants").select("*").eq("user_id", userId),
    service.from("assignment_daily_checkin").select("*").eq("user_id", userId),
    service.from("special_status_requests").select("*").eq("user_id", userId),
    service.from("active_special_status").select("*").eq("user_id", userId),
    service.from("onboarding_steps").select("*").eq("user_id", userId),
    service.from("kpi_feedback").select("*").eq("user_id", userId),
    service.from("kpi_praemien").select("*").eq("user_id", userId),
    service.from("todo_history").select("*").eq("user_id", userId),
    service.from("chat_messages").select("id, conversation_id, message_text, message_type, file_name, edited, created_at, updated_at, deleted_for_all, deleted_at").eq("sender_id", userId),
    service.from("chat_participants").select("conversation_id, joined_at, last_read_at, marked_unread, cleared_at").eq("user_id", userId),
    service.from("chat_message_reactions").select("message_id, emoji, created_at").eq("user_id", userId),
    service.from("message_recipients").select("message_id, read_at, acknowledged_at, created_at").eq("recipient_user_id", userId),
  ]);

  const promotorProfile = promotorProfileResult.data as any;
  const applicationResult = promotorProfile?.application_id
    ? await service.from("applications").select("*").eq("id", promotorProfile.application_id).maybeSingle()
    : { data: null };
  const assignmentIds = [...new Set((participationsResult.data || []).map((item: any) => String(item.assignment_id)))];
  const assignmentsResult = assignmentIds.length
    ? await service.from("assignments").select("*").in("id", assignmentIds)
    : { data: [] as any[] };
  const trackingResult = assignmentIds.length
    ? await service.from("assignment_tracking").select("*").eq("user_id", userId).in("assignment_id", assignmentIds)
    : { data: [] as any[] };
  const receivedMessageIds = (messageRecipientsResult.data || []).map((item: any) => String(item.message_id));
  const receivedMessagesResult = receivedMessageIds.length
    ? await service.from("messages").select("id, sender_id, message_text, message_type, created_at, sent_at, status").in("id", receivedMessageIds)
    : { data: [] as any[] };

  const credentials = credentialsResult.data as any;
  const redactedCredentials = credentials ? {
    id: credentials.id,
    huebner_email: credentials.huebner_email,
    huebner_password_configured: Boolean(credentials.huebner_password),
    demotool_email: credentials.demotool_email,
    demotool_password_configured: Boolean(credentials.demotool_password),
    tma_email: credentials.tma_email,
    tma_password_configured: Boolean(credentials.tma_password),
    boost_app_email: credentials.boost_app_email,
    boost_app_password_configured: Boolean(credentials.boost_app_password),
    easyname_email: credentials.easyname_email,
    easyname_password_configured: Boolean(credentials.easyname_password),
    created_at: credentials.created_at,
    updated_at: credentials.updated_at,
  } : null;

  const exportData = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      privacy_request_id: privacyRequest.id,
      subject_user_id: userId,
      scope_note: "Sicherheitsgeheimnisse, interne Adminnotizen und Daten Dritter sind nicht Bestandteil dieses Exports.",
    },
    account: {
      email: authUserResult.user?.email || privacyRequest.subject_email || null,
      created_at: authUserResult.user?.created_at || null,
      last_sign_in_at: authUserResult.user?.last_sign_in_at || null,
      user_profile: userProfileResult.data || null,
      promotor_profile: promotorProfile || null,
      application: applicationResult.data || null,
    },
    documents: documentsResult.data || [],
    contract_files: contractFilesResult.data || [],
    external_accounts: redactedCredentials,
    assignments: assignmentsResult.data || [],
    assignment_participations: participationsResult.data || [],
    assignment_tracking: trackingResult.data || [],
    daily_checkins: dailyCheckinsResult.data || [],
    special_status_requests: specialRequestsResult.data || [],
    active_special_status: activeStatusResult.data || [],
    onboarding: onboardingResult.data || [],
    kpi_feedback: kpiFeedbackResult.data || [],
    kpi_bonuses: kpiBonusesResult.data || [],
    completed_todos: todosResult.data || [],
    authored_chat_messages: ownChatMessagesResult.data || [],
    chat_participation: chatParticipationResult.data || [],
    chat_reactions: reactionsResult.data || [],
    received_admin_messages: receivedMessagesResult.data || [],
    received_admin_message_status: messageRecipientsResult.data || [],
  };

  await Promise.all([
    service.from("privacy_request_events").insert({
      request_id: privacyRequest.id,
      actor_user_id: auth.user.id,
      event_type: "export_generated",
      from_status: privacyRequest.status,
      to_status: privacyRequest.status,
    }),
    recordDataAccess({
      actorUserId: auth.user.id,
      action: "privacy_export_generated",
      resourceType: "privacy_request",
      resourceId: privacyRequest.id,
      subjectUserId: userId,
    }),
  ]);

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="salescrew-datenauskunft-${privacyRequest.id}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
