'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  File, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  bucket: string
  folder?: string
  fileType?: 'documents' | 'images' | 'contracts'
  maxFiles?: number
  maxSize?: number // in MB
  accept?: Record<string, string[]>
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadError?: (error: string) => void
  existingFiles?: UploadedFile[]
  className?: string
}

interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  publicUrl: string
  uploadedAt: string
}

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  uploadedFile?: UploadedFile
}

const getFileIcon = (fileType: string) => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  const documentTypes = ['pdf', 'doc', 'docx', 'txt']
  
  if (imageTypes.includes(fileType.toLowerCase())) {
    return Image
  } else if (documentTypes.includes(fileType.toLowerCase())) {
    return FileText
  }
  return File
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function FileUpload({
  bucket,
  folder = '',
  fileType = 'documents',
  maxFiles = 5,
  maxSize = 10,
  accept,
  onUploadComplete,
  onUploadError,
  existingFiles = [],
  className
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles)

  const defaultAccept = {
    documents: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    images: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    contracts: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  }

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    formData.append('folder', folder)
    formData.append('type', fileType)

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    const result = await response.json()
    return result.data
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const filesToUpload = acceptedFiles.slice(0, maxFiles - uploadedFiles.length)
    
    if (filesToUpload.length === 0) {
      onUploadError?.('Maximum number of files reached')
      return
    }

    // Initialize progress tracking
    const initialProgress: UploadProgress[] = filesToUpload.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploadProgress(prev => [...prev, ...initialProgress])

    // Upload files sequentially
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      
      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => 
            prev.map(p => 
              p.file === file && p.progress < 90
                ? { ...p, progress: p.progress + 10 }
                : p
            )
          )
        }, 200)

        const uploadedFile = await uploadFile(file)

        clearInterval(progressInterval)

        // Update progress to completed
        setUploadProgress(prev => 
          prev.map(p => 
            p.file === file
              ? { ...p, progress: 100, status: 'completed', uploadedFile }
              : p
          )
        )

        // Add to uploaded files
        setUploadedFiles(prev => [...prev, uploadedFile])

      } catch (error) {
        setUploadProgress(prev => 
          prev.map(p => 
            p.file === file
              ? { ...p, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : p
          )
        )

        onUploadError?.(error instanceof Error ? error.message : 'Upload failed')
      }
    }

    // Call completion callback
    setTimeout(() => {
      const completedFiles = uploadProgress
        .filter(p => p.status === 'completed' && p.uploadedFile)
        .map(p => p.uploadedFile!)
      
      if (completedFiles.length > 0) {
        onUploadComplete?.(completedFiles)
      }
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setUploadProgress([])
      }, 3000)
    }, 1000)

  }, [bucket, folder, fileType, maxFiles, uploadedFiles.length, onUploadComplete, onUploadError])

  const removeFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/upload?id=${fileId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
      }
    } catch (error) {
      onUploadError?.('Failed to delete file')
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || defaultAccept[fileType],
    maxSize: maxSize * 1024 * 1024,
    disabled: uploadedFiles.length >= maxFiles
  })

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <Card 
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
          uploadedFiles.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
      >
        <CardContent className="p-6 text-center">
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop files here...</p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Max {maxFiles} files, up to {maxSize}MB each
              </p>
              <p className="text-xs text-muted-foreground">
                Accepted: {Object.values(accept || defaultAccept[fileType]).flat().join(', ')}
              </p>
            </div>
          )}
          {uploadedFiles.length >= maxFiles && (
            <p className="text-sm text-destructive mt-2">
              Maximum number of files reached
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploading files...</h4>
          {uploadProgress.map((progress, index) => {
            const IconComponent = getFileIcon(progress.file.name.split('.').pop() || '')
            
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <IconComponent className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{progress.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(progress.file.size)}
                        </span>
                      </div>
                      {progress.status === 'uploading' && (
                        <Progress value={progress.progress} className="h-2" />
                      )}
                      {progress.status === 'error' && (
                        <div className="flex items-center space-x-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{progress.error}</span>
                        </div>
                      )}
                      {progress.status === 'completed' && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Upload completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded files ({uploadedFiles.length})</h4>
          {uploadedFiles.map((file) => {
            const IconComponent = getFileIcon(file.fileType)
            
            return (
              <Card key={file.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <IconComponent className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.fileSize)} • {file.fileType.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {file.fileType.toUpperCase()}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={file.publicUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}