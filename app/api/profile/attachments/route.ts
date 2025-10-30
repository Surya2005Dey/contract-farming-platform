import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileUploadId, attachmentType, isPrimary = false } = body

    if (!fileUploadId || !attachmentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify file upload exists and belongs to user
    const { data: fileUpload, error: fileError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileUploadId)
      .eq('user_id', user.id)
      .eq('upload_status', 'completed')
      .single()

    if (fileError || !fileUpload) {
      return NextResponse.json(
        { error: 'File not found or not uploaded by user' },
        { status: 404 }
      )
    }

    // If setting as primary, remove primary status from other attachments of same type
    if (isPrimary) {
      await supabase
        .from('profile_attachments')
        .update({ is_primary: false })
        .eq('profile_id', user.id)
        .eq('attachment_type', attachmentType)
    }

    // Create profile attachment
    const { data: attachment, error: attachmentError } = await supabase
      .from('profile_attachments')
      .insert({
        profile_id: user.id,
        file_upload_id: fileUploadId,
        attachment_type: attachmentType,
        is_primary: isPrimary
      })
      .select(`
        *,
        file_upload:file_uploads(*)
      `)
      .single()

    if (attachmentError) {
      return NextResponse.json(
        { error: 'Failed to create profile attachment', details: attachmentError.message },
        { status: 500 }
      )
    }

    // Update file upload to link to profile
    await supabase
      .from('file_uploads')
      .update({
        related_entity_type: 'profile',
        related_entity_id: user.id
      })
      .eq('id', fileUploadId)

    // If this is a primary avatar, update the profile table
    if (attachmentType === 'avatar' && isPrimary) {
      await supabase
        .from('profiles')
        .update({
          avatar_url: fileUpload.public_url
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: attachment
    })

  } catch (error) {
    console.error('Profile attachment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const profileId = searchParams.get('profileId') || user.id
    const attachmentType = searchParams.get('type')

    let query = supabase
      .from('profile_attachments')
      .select(`
        *,
        file_upload:file_uploads(*)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (attachmentType) {
      query = query.eq('attachment_type', attachmentType)
    }

    const { data: attachments, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch profile attachments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: attachments || []
    })

  } catch (error) {
    console.error('Fetch profile attachments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { attachmentId, isPrimary } = body

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID required' },
        { status: 400 }
      )
    }

    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('profile_attachments')
      .select('*, file_upload:file_uploads(*)')
      .eq('id', attachmentId)
      .eq('profile_id', user.id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // If setting as primary, remove primary status from other attachments of same type
    if (isPrimary) {
      await supabase
        .from('profile_attachments')
        .update({ is_primary: false })
        .eq('profile_id', user.id)
        .eq('attachment_type', attachment.attachment_type)
    }

    // Update attachment
    const { data: updatedAttachment, error: updateError } = await supabase
      .from('profile_attachments')
      .update({ is_primary: isPrimary })
      .eq('id', attachmentId)
      .select('*, file_upload:file_uploads(*)')
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update attachment' },
        { status: 500 }
      )
    }

    // If this is now the primary avatar, update the profile table
    if (attachment.attachment_type === 'avatar' && isPrimary) {
      await supabase
        .from('profiles')
        .update({
          avatar_url: attachment.file_upload.public_url
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment updated successfully',
      data: updatedAttachment
    })

  } catch (error) {
    console.error('Update attachment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID required' },
        { status: 400 }
      )
    }

    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('profile_attachments')
      .select('*, file_upload:file_uploads(*)')
      .eq('id', attachmentId)
      .eq('profile_id', user.id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Delete the attachment record
    const { error: deleteError } = await supabase
      .from('profile_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      )
    }

    // If this was the primary avatar, clear it from profile
    if (attachment.attachment_type === 'avatar' && attachment.is_primary) {
      await supabase
        .from('profiles')
        .update({
          avatar_url: null
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Profile attachment deleted successfully'
    })

  } catch (error) {
    console.error('Delete profile attachment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}