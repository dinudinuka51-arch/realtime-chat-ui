import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Image, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateStoryProps {
  userId: string;
  onClose: () => void;
  onStoryCreated: () => void;
}

export const CreateStory = ({ userId, onClose, onStoryCreated }: CreateStoryProps) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!mediaFile) {
      toast.error('Please select an image or video');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('stories-media')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('stories-media')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('stories').insert({
        user_id: userId,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
      });

      if (insertError) throw insertError;

      toast.success('Story posted!');
      onStoryCreated();
      onClose();
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to create story');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">Create Story</h2>
          <Button
            onClick={handleSubmit}
            disabled={!mediaFile || isUploading}
            size="sm"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {mediaPreview ? (
            <div className="relative w-full max-w-md aspect-[9/16] bg-muted rounded-lg overflow-hidden">
              {mediaType === 'video' ? (
                <video
                  src={mediaPreview}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setMediaFile(null);
                  setMediaPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="w-full max-w-md aspect-[9/16] bg-muted rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer border-2 border-dashed border-muted-foreground/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Image className="h-8 w-8 text-primary" />
                </div>
                <div className="p-4 bg-primary/10 rounded-full">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground">Tap to add photo or video</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {mediaPreview && (
            <div className="w-full max-w-md mt-4">
              <Textarea
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
