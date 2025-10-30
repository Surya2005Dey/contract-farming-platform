-- File uploads tracking table
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  bucket TEXT NOT NULL,
  folder TEXT,
  content_type TEXT,
  public_url TEXT,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
  related_entity_type TEXT, -- 'contract', 'profile', 'message', etc.
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract attachments table for linking files to contracts
CREATE TABLE IF NOT EXISTS public.contract_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  file_upload_id UUID NOT NULL REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('contract_document', 'specification', 'legal_document', 'image', 'other')),
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contract_id, file_upload_id)
);

-- Profile attachments for profile images and documents
CREATE TABLE IF NOT EXISTS public.profile_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_upload_id UUID NOT NULL REFERENCES public.file_uploads(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('avatar', 'cover_image', 'certificate', 'license', 'verification_document')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, file_upload_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_bucket ON public.file_uploads(bucket);
CREATE INDEX IF NOT EXISTS idx_file_uploads_status ON public.file_uploads(upload_status);
CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract_id ON public.contract_attachments(contract_id);
CREATE INDEX IF NOT EXISTS idx_profile_attachments_profile_id ON public.profile_attachments(profile_id);

-- Enable RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_uploads
CREATE POLICY "Users can view their own files" ON public.file_uploads 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload files" ON public.file_uploads 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON public.file_uploads 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON public.file_uploads 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for contract_attachments
CREATE POLICY "Users can view contract attachments for their contracts" ON public.contract_attachments 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_attachments.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );

CREATE POLICY "Contract participants can add attachments" ON public.contract_attachments 
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.contracts 
      WHERE contracts.id = contract_attachments.contract_id 
      AND (contracts.farmer_id = auth.uid() OR contracts.buyer_id = auth.uid())
    )
  );

CREATE POLICY "Uploaders can delete their attachments" ON public.contract_attachments 
  FOR DELETE USING (auth.uid() = uploaded_by);

-- RLS Policies for profile_attachments
CREATE POLICY "Users can view their own profile attachments" ON public.profile_attachments 
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can manage their own profile attachments" ON public.profile_attachments 
  FOR ALL USING (auth.uid() = profile_id);

-- Function to update file upload timestamp
CREATE OR REPLACE FUNCTION update_file_upload_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for file uploads
CREATE TRIGGER update_file_uploads_timestamp
  BEFORE UPDATE ON public.file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_file_upload_timestamp();

-- Function to clean up orphaned files (can be called by a scheduled job)
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete file records older than 24 hours with failed status
  DELETE FROM public.file_uploads 
  WHERE upload_status = 'failed' 
  AND created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_uploads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_attachments TO authenticated;