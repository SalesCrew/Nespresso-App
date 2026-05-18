-- Table to store the final, sent Dienstvertrag HTML with admin edits
-- This is the source of truth for what was sent to the promotor

CREATE TABLE IF NOT EXISTS public.sent_dienstvertrag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  UNIQUE(contract_id)
);

-- Create index for faster lookups by contract_id
CREATE INDEX IF NOT EXISTS idx_sent_dienstvertrag_contract ON public.sent_dienstvertrag(contract_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_sent_dienstvertrag_user ON public.sent_dienstvertrag(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sent_dienstvertrag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_sent_dienstvertrag_updated_at ON public.sent_dienstvertrag;
CREATE TRIGGER trigger_update_sent_dienstvertrag_updated_at
  BEFORE UPDATE ON public.sent_dienstvertrag
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sent_dienstvertrag_updated_at();

-- Enable Row Level Security
ALTER TABLE public.sent_dienstvertrag ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin staff and admin of admins can do everything
CREATE POLICY "Admins have full access to sent contracts" ON public.sent_dienstvertrag
  FOR ALL USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin_of_admins', 'admin_staff')
  ) WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('admin_of_admins', 'admin_staff')
  );

-- RLS Policy: Promotors can view their own sent contracts
CREATE POLICY "Promotors can view their own sent contracts" ON public.sent_dienstvertrag
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'promotor'
    AND user_id = auth.uid()
  );

-- RLS Policy: Service role has full access (for API operations)
CREATE POLICY "Service role has full access to sent contracts" ON public.sent_dienstvertrag
  FOR ALL USING (auth.role() = 'service_role');

