import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = {
  documents: ['pdf', 'doc', 'docx', 'txt'],
  images: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  contracts: ['pdf', 'doc', 'docx']
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const folder = formData.get('folder') as string || ''
    const fileType = formData.get('type') as string || 'documents'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket name required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large', details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES]?.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type', details: `Allowed types: ${ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES]?.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `${user.id}/${folder ? folder + '/' : ''}${timestamp}_${randomString}.${fileExtension}`

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed', details: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    // Store file metadata in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('file_uploads')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: fileExtension,
        bucket: bucket,
        folder: folder,
        content_type: file.type,
        public_url: urlData.publicUrl,
        upload_status: 'completed'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file if database insert fails
      await supabase.storage.from(bucket).remove([fileName])
      return NextResponse.json(
        { error: 'Database error', details: dbError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: fileRecord.id,
        fileName: file.name,
        filePath: fileName,
        fileSize: file.size,
        fileType: fileExtension,
        publicUrl: urlData.publicUrl,
        uploadedAt: fileRecord.created_at
      }
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const bucket = searchParams.get('bucket')
    const folder = searchParams.get('folder')
    const fileType = searchParams.get('type')

    let query = supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', user.id)
      .eq('upload_status', 'completed')
      .order('created_at', { ascending: false })

    if (bucket) {
      query = query.eq('bucket', bucket)
    }

    if (folder) {
      query = query.eq('folder', folder)
    }

    if (fileType) {
      query = query.eq('file_type', fileType)
    }

    const { data: files, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch files', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: files || []
    })

  } catch (error) {
    console.error('File fetch error:', error)
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

    const fileId = searchParams.get('id')

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID required' },
        { status: 400 }
      )
    }

    // Get file record
    const { data: fileRecord, error: fetchError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(fileRecord.bucket)
      .remove([fileRecord.file_path])

    if (deleteError) {
      console.error('Storage delete error:', deleteError)
    }

    // Delete from database
    const { error: dbDeleteError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', fileId)

    if (dbDeleteError) {
      return NextResponse.json(
        { error: 'Failed to delete file record', details: dbDeleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('File delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}