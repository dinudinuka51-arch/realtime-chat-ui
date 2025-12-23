import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Image, Video, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MediaUploadProps {
  conversationId: string;
  onMediaSent: () => void;
}

export const MediaUpload = ({ conversationId, onMediaSent }: MediaUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const uploadMedia = async (file: File, type: 'image' | 'video') => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: type === 'image' ? '📷 Photo' : '🎥 Video',
        message_type: type,
        media_url: publicUrl,
        media_type: type,
      });

      if (msgError) throw msgError;

      toast.success(`${type === 'image' ? 'Photo' : 'Video'} sent!`);
      onMediaSent();
    } catch (error: any) {
      console.error('Error uploading media:', error);
      toast.error(`Failed to send ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File size check (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    uploadMedia(file, type);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-1">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'video')}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => imageInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Image className="w-5 h-5" />
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => videoInputRef.current?.click()}
        disabled={uploading}
      >
        <Video className="w-5 h-5" />
      </Button>
    </div>
  );
};
