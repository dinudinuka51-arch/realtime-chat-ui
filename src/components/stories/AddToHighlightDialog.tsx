import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  caption?: string;
}

interface Highlight {
  id: string;
  title: string;
  cover_url: string | null;
}

interface AddToHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story: Story | null;
  onSuccess: () => void;
}

export const AddToHighlightDialog = ({
  open,
  onOpenChange,
  story,
  onSuccess,
}: AddToHighlightDialogProps) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchHighlights();
    }
  }, [open, user]);

  const fetchHighlights = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('story_highlights')
      .select('id, title, cover_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setHighlights(data);
  };

  const handleCreateHighlight = async () => {
    if (!user || !story || !newTitle.trim()) return;
    
    setLoading(true);
    try {
      // Create new highlight
      const { data: highlight, error: highlightError } = await supabase
        .from('story_highlights')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
          cover_url: story.media_url,
        })
        .select()
        .single();

      if (highlightError) throw highlightError;

      // Add story to highlight
      const { error: storyError } = await supabase
        .from('highlight_stories')
        .insert({
          highlight_id: highlight.id,
          story_id: story.id,
          media_url: story.media_url,
          media_type: story.media_type,
          caption: story.caption,
        });

      if (storyError) throw storyError;

      toast.success('Story added to new highlight!');
      onSuccess();
      onOpenChange(false);
      setNewTitle('');
      setCreating(false);
    } catch (error) {
      console.error('Error creating highlight:', error);
      toast.error('Failed to create highlight');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToExisting = async () => {
    if (!story || !selectedHighlight) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('highlight_stories')
        .insert({
          highlight_id: selectedHighlight,
          story_id: story.id,
          media_url: story.media_url,
          media_type: story.media_type,
          caption: story.caption,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Story already in this highlight');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Story added to highlight!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding to highlight:', error);
      toast.error('Failed to add to highlight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Highlight</DialogTitle>
        </DialogHeader>

        {creating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Highlight Name</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter highlight name..."
                maxLength={30}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateHighlight}
                disabled={loading || !newTitle.trim()}
              >
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create New Highlight */}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => setCreating(true)}
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <span>New Highlight</span>
            </Button>

            {/* Existing Highlights */}
            {highlights.length > 0 && (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {highlights.map((highlight) => (
                    <button
                      key={highlight.id}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        selectedHighlight === highlight.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedHighlight(highlight.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={highlight.cover_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {highlight.title.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-left font-medium">
                        {highlight.title}
                      </span>
                      {selectedHighlight === highlight.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedHighlight && (
              <Button
                className="w-full"
                onClick={handleAddToExisting}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add to Highlight'}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
