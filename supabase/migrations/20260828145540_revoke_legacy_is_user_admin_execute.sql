begin;

-- No application call site or RLS policy uses this legacy RPC. Keep it
-- available to service-side maintenance only and remove the exposed
-- SECURITY DEFINER execution path flagged by the Supabase advisor.
revoke execute on function public.is_user_admin(uuid) from authenticated;

commit;
