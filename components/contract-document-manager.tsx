'use client'

import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload, 
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface ContractDocumentManagerProps {
  contractId: string
  isReadOnly?: boolean
}

interface ContractAttachment {
  id: string
  attachment_type: string
  description: string
  created_at: string
  file_upload: {
    id: string
    file_name: string
    file_size: number
    file_type: string
    public_url: string
  }
  uploader: {
    full_name: string
  }
}

const ATTACHMENT_TYPES = [
  { value: 'contract_document', label: 'Contract Document', description: 'Main contract agreement' },
  { value: 'specification', label: 'Specifications', description: 'Technical specifications or requirements' },
  { value: 'legal_document', label: 'Legal Document', description: 'Legal agreements, terms, etc.' },
  { value: 'image', label: 'Image', description: 'Photos or visual documentation' },
  { value: 'other', label: 'Other', description: 'Other supporting documents' }
]

export function ContractDocumentManager({ contractId, isReadOnly = false }: ContractDocumentManagerProps) {
  const [attachments, setAttachments] = useState<ContractAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedType, setSelectedType] = useState('contract_document')
  const [description, setDescription] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchAttachments()
  }, [contractId])

  const fetchAttachments = async () => {
    try {
      const response = await fetch(`/api/contracts/attachments?contractId=${contractId}`)
      if (response.ok) {
        const result = await response.json()
        setAttachments(result.data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load contract documents',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load contract documents',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (uploadedFiles: any[]) => {
    if (uploadedFiles.length === 0) return

    setUploading(true)

    try {
      for (const file of uploadedFiles) {
        const response = await fetch('/api/contracts/attachments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contractId,
            fileUploadId: file.id,
            attachmentType: selectedType,
            description: description.trim() || undefined
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to attach document')
        }
      }

      toast({
        title: 'Success',
        description: `${uploadedFiles.length} document(s) attached successfully`
      })

      setDescription('')
      fetchAttachments()

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to attach documents',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/contracts/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId))
        toast({
          title: 'Success',
          description: 'Document removed successfully'
        })
      } else {
        throw new Error('Failed to delete attachment')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove document',
        variant: 'destructive'
      })
    }
  }

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'contract_document':
        return <FileText className="h-5 w-5 text-blue-500" />
      case 'legal_document':
        return <FileText className="h-5 w-5 text-purple-500" />
      case 'specification':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'image':
        return <Eye className="h-5 w-5 text-orange-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Documents</CardTitle>
          <CardDescription>Loading documents...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Contract Documents</span>
          </CardTitle>
          <CardDescription>
            Upload and manage documents related to this contract
          </CardDescription>
        </CardHeader>

        {!isReadOnly && (
          <CardContent className="space-y-4">
            {/* Upload Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Document Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTACHMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                  <Textarea
                    placeholder="Brief description of the document..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <FileUpload
                bucket="contract-documents"
                folder={contractId}
                fileType="contracts"
                maxFiles={5}
                onUploadComplete={handleFileUpload}
                onUploadError={(error) => toast({
                  title: 'Upload Error',
                  description: error,
                  variant: 'destructive'
                })}
              />
            </div>

            {uploading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Upload className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Attaching documents to contract...</span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Existing Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Attached Documents ({attachments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents attached yet</p>
              {!isReadOnly && (
                <p className="text-sm">Upload documents to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {ATTACHMENT_TYPES.map((type) => {
                const typeAttachments = attachments.filter(a => a.attachment_type === type.value)
                
                if (typeAttachments.length === 0) return null

                return (
                  <div key={type.value}>
                    <div className="flex items-center space-x-2 mb-3">
                      {getAttachmentIcon(type.value)}
                      <h4 className="font-medium">{type.label}</h4>
                      <Badge variant="secondary">{typeAttachments.length}</Badge>
                    </div>

                    <div className="space-y-2 ml-7">
                      {typeAttachments.map((attachment) => (
                        <Card key={attachment.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="font-medium">{attachment.file_upload.file_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatFileSize(attachment.file_upload.file_size)} • 
                                    {attachment.file_upload.file_type.toUpperCase()} • 
                                    Uploaded by {attachment.uploader.full_name}
                                  </p>
                                  {attachment.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {attachment.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a 
                                  href={attachment.file_upload.public_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>

                              {!isReadOnly && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAttachment(attachment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <Separator className="mt-4" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}