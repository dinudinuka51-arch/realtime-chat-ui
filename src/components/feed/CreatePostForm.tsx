import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image, Video, X, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CreatePostFormProps {
  onPostCreated: () => void;
  userProfile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const CreatePostForm = ({ onPostCreated, userProfile }: CreatePostFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast.error('Please add some content or media');
      return;
    }

    if (!user) {
      toast.error('Please login to post');
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      // Upload media if present
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('chat-media')
          .getPublicUrl(uploadData.path);

        mediaUrl = publicUrl.publicUrl;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: content.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (postError) throw postError;

      setContent('');
      clearMedia();
      onPostCreated();
      toast.success('Post created!');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
      <div className="flex gap-3">
        <div className="relative">
          <Avatar className="w-11 h-11 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
              {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="What's happening? Share your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-0 bg-gradient-to-br from-muted/30 to-muted/50 focus-visible:ring-2 focus-visible:ring-primary/30 rounded-xl text-sm placeholder:text-muted-foreground/60"
          />

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative inline-block">
              {mediaFile?.type.startsWith('video/') ? (
                <video
                  src={mediaPreview}
                  className="max-h-48 rounded-xl"
                  controls
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="max-h-48 rounded-xl object-cover"
                />
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={clearMedia}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex gap-1">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileSelect}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Image className="h-4 w-4 mr-1.5" />
                Photo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="hover:bg-accent/10 hover:text-accent transition-colors"
              >
                <Video className="h-4 w-4 mr-1.5" />
                Video
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !mediaFile)}
              className="rounded-full px-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-md hover:shadow-lg transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
