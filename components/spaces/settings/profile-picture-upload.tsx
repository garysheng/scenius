'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X } from 'lucide-react';
import { spacesService } from '@/lib/services/client/spaces';

interface ProfilePictureUploadProps {
  spaceId: string;
  currentImageUrl?: string | null;
  spaceName: string;
  onImageUpdate: (url: string | null) => void;
}

export function ProfilePictureUpload({ 
  spaceId, 
  currentImageUrl, 
  spaceName,
  onImageUpdate 
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const imageUrl = await spacesService.uploadSpaceImage(spaceId, file);
      onImageUpdate(imageUrl);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setUploading(true);
      await spacesService.removeSpaceImage(spaceId);
      onImageUpdate(null);
    } catch (error) {
      console.error('Failed to remove image:', error);
      alert('Failed to remove image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Profile Picture</Label>
      <div className="flex items-center gap-6">
        <Avatar className="w-24 h-24">
          <AvatarImage src={currentImageUrl || undefined} alt={spaceName} />
          <AvatarFallback className="text-2xl">
            {spaceName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => document.getElementById('profile-picture-input')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {currentImageUrl ? 'Change Picture' : 'Upload Picture'}
            </Button>
            {currentImageUrl && (
              <Button
                variant="outline"
                disabled={uploading}
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a square image (max 5MB)
          </p>
        </div>
      </div>
      <input
        id="profile-picture-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
} 