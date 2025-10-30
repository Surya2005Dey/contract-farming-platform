'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/use-user'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Camera, 
  Star, 
  Trash2, 
  Upload, 
  User,
  Image as ImageIcon,
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ProfileImageManagerProps {
  profileId?: string
  isReadOnly?: boolean
}

interface ProfileAttachment {
  id: string
  attachment_type: string
  is_primary: boolean
  created_at: string
  file_upload: {
    id: string
    file_name: string
    file_size: number
    file_type: string
    public_url: string
  }
}

const ATTACHMENT_TYPES = [
  { value: 'avatar', label: 'Profile Picture', icon: User, description: 'Your main profile picture' },
  { value: 'cover_image', label: 'Cover Image', icon: ImageIcon, description: 'Background cover image' },
  { value: 'certificate', label: 'Certificate', icon: FileText, description: 'Professional certificates' },
  { value: 'license', label: 'License', icon: FileText, description: 'Business licenses' },
  { value: 'verification_document', label: 'Verification', icon: FileText, description: 'Identity verification documents' }
]

export function ProfileImageManager({ profileId, isReadOnly = false }: ProfileImageManagerProps) {
  const { user } = useUser()
  const [attachments, setAttachments] = useState<ProfileAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('avatar')
  const { toast } = useToast()

  const isOwnProfile = !profileId || profileId === user?.id

  useEffect(() => {
    if (user || profileId) {
      fetchAttachments()
    }
  }, [user, profileId])

  const fetchAttachments = async () => {
    try {
      const url = `/api/profile/attachments${profileId ? `?profileId=${profileId}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        setAttachments(result.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile images',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (uploadedFiles: any[]) => {
    if (uploadedFiles.length === 0) return

    try {
      for (const file of uploadedFiles) {
        const response = await fetch('/api/profile/attachments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileUploadId: file.id,
            attachmentType: selectedType,
            isPrimary: selectedType === 'avatar' // Make avatars primary by default
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to attach image')
        }
      }

      toast({
        title: 'Success',
        description: `${uploadedFiles.length} image(s) uploaded successfully`
      })

      fetchAttachments()

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: 'destructive'
      })
    }
  }

  const handleSetPrimary = async (attachmentId: string) => {
    try {
      const response = await fetch('/api/profile/attachments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attachmentId,
          isPrimary: true
        })
      })

      if (response.ok) {
        fetchAttachments()
        toast({
          title: 'Success',
          description: 'Primary image updated'
        })
      } else {
        throw new Error('Failed to update primary image')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update primary image',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/profile/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId))
        toast({
          title: 'Success',
          description: 'Image deleted successfully'
        })
      } else {
        throw new Error('Failed to delete image')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive'
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const primaryAvatar = attachments.find(a => a.attachment_type === 'avatar' && a.is_primary)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Images</CardTitle>
          <CardDescription>Loading images...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Picture</span>
          </CardTitle>
          <CardDescription>
            Your main profile picture visible to other users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={primaryAvatar?.file_upload.public_url} />
              <AvatarFallback className="text-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              {primaryAvatar ? (
                <div>
                  <p className="font-medium">{primaryAvatar.file_upload.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(primaryAvatar.file_upload.file_size)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">No profile picture</p>
                  <p className="text-sm text-muted-foreground">Upload an image to get started</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      {isOwnProfile && !isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Upload Images</span>
            </CardTitle>
            <CardDescription>
              Upload profile pictures, certificates, and verification documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Image Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ATTACHMENT_TYPES.map((type) => {
                  const IconComponent = type.icon
                  return (
                    <Button
                      key={type.value}
                      variant={selectedType === type.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType(type.value)}
                      className="justify-start"
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {type.label}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {ATTACHMENT_TYPES.find(t => t.value === selectedType)?.description}
              </p>
            </div>

            <FileUpload
              bucket="profile-images"
              folder={user?.id || 'default'}
              fileType="images"
              maxFiles={3}
              onUploadComplete={handleFileUpload}
              onUploadError={(error) => toast({
                title: 'Upload Error',
                description: error,
                variant: 'destructive'
              })}
            />
          </CardContent>
        </Card>
      )}

      {/* All Images */}
      <div className="space-y-4">
        {ATTACHMENT_TYPES.map((type) => {
          const typeAttachments = attachments.filter(a => a.attachment_type === type.value)
          
          if (typeAttachments.length === 0) return null

          const IconComponent = type.icon

          return (
            <Card key={type.value}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <IconComponent className="h-5 w-5" />
                  <span>{type.label}</span>
                  <Badge variant="secondary">{typeAttachments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {typeAttachments.map((attachment) => (
                    <div key={attachment.id} className="relative group">
                      <div className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-colors",
                        attachment.is_primary ? "border-primary" : "border-muted"
                      )}>
                        {type.value === 'avatar' || type.value === 'cover_image' ? (
                          <img
                            src={attachment.file_upload.public_url}
                            alt={attachment.file_upload.file_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {attachment.is_primary && (
                        <Badge className="absolute top-2 left-2">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}

                      {isOwnProfile && !isReadOnly && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                          {!attachment.is_primary && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleSetPrimary(attachment.id)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <div className="mt-2">
                        <p className="text-sm font-medium truncate">
                          {attachment.file_upload.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_upload.file_size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {attachments.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No images uploaded yet</p>
              {isOwnProfile && !isReadOnly && (
                <p className="text-sm text-muted-foreground">Upload your first image to get started</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}