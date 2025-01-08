import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { FileAttachment } from '@/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'audio/*',
  'video/*'
];

export const filesService = {
  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 50MB' };
    }

    const isAllowedType = ALLOWED_TYPES.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(category + '/');
      }
      return file.type === type;
    });

    if (!isAllowedType) {
      return { valid: false, error: 'File type not supported' };
    }

    return { valid: true };
  },

  async uploadFile(
    file: File,
    spaceId: string,
    channelId: string,
    onProgress?: (progress: number) => void
  ): Promise<FileAttachment> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileId = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop();
    const filePath = `spaces/${spaceId}/channels/${channelId}/files/${fileId}.${fileExtension}`;
    const fileRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(fileRef);
            
            const attachment: FileAttachment = {
              id: fileId,
              fileUrl: downloadUrl,
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              uploadStatus: 'complete',
              uploadProgress: 100,
              thumbnailUrl: file.type.startsWith('image/') ? downloadUrl : undefined
            };

            resolve(attachment);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }
}; 