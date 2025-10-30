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
    const { contractId, fileUploadId, attachmentType, description } = body

    if (!contractId || !fileUploadId || !attachmentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify contract exists and user has access
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, farmer_id, buyer_id')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Check if user is authorized (farmer or buyer of the contract)
    if (contract.farmer_id !== user.id && contract.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to attach files to this contract' },
        { status: 403 }
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

    // Create contract attachment
    const { data: attachment, error: attachmentError } = await supabase
      .from('contract_attachments')
      .insert({
        contract_id: contractId,
        file_upload_id: fileUploadId,
        attachment_type: attachmentType,
        description: description || null,
        uploaded_by: user.id
      })
      .select(`
        *,
        file_upload:file_uploads(*)
      `)
      .single()

    if (attachmentError) {
      return NextResponse.json(
        { error: 'Failed to create attachment', details: attachmentError.message },
        { status: 500 }
      )
    }

    // Update file upload to link to contract
    await supabase
      .from('file_uploads')
      .update({
        related_entity_type: 'contract',
        related_entity_id: contractId
      })
      .eq('id', fileUploadId)

    // Create notification for the other party
    const otherPartyId = contract.farmer_id === user.id ? contract.buyer_id : contract.farmer_id
    if (otherPartyId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: otherPartyId,
          type: 'contract',
          title: 'New Contract Document',
          content: `A new document has been attached to your contract.`,
          related_id: contractId
        })
    }

    return NextResponse.json({
      success: true,
      message: 'Document attached successfully',
      data: attachment
    })

  } catch (error) {
    console.error('Contract attachment error:', error)
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

    const contractId = searchParams.get('contractId')

    if (!contractId) {
      return NextResponse.json(
        { error: 'Contract ID required' },
        { status: 400 }
      )
    }

    // Verify user has access to contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('farmer_id, buyer_id')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    if (contract.farmer_id !== user.id && contract.buyer_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get contract attachments
    const { data: attachments, error } = await supabase
      .from('contract_attachments')
      .select(`
        *,
        file_upload:file_uploads(*),
        uploader:profiles!contract_attachments_uploaded_by_fkey(full_name)
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch attachments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: attachments || []
    })

  } catch (error) {
    console.error('Fetch attachments error:', error)
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
      .from('contract_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('uploaded_by', user.id)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Delete the attachment record
    const { error: deleteError } = await supabase
      .from('contract_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    })

  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}