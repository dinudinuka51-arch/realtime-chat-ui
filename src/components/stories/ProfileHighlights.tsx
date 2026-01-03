import { useState, useEffect, useCallback } from 'react';
import { Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HighlightCircle } from './HighlightCircle';
import { HighlightViewer } from './HighlightViewer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Highlight {
  id: string;
  title: string;
  cover_url: string | null;
  stories: {
    id: string;
    media_url: string;
    media_type: string;
    caption: string | null;
  }[];
}

interface ProfileHighlightsProps {
  userId: string;
  isOwnProfile: boolean;
}

export const ProfileHighlights = ({ userId, isOwnProfile }: ProfileHighlightsProps) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const fetchHighlights = useCallback(async () => {
    const { data: highlightsData } = await supabase
      .from('story_highlights')
      .select('id, title, cover_url')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!highlightsData) {
      setLoading(false);
      return;
    }

    // Fetch stories for each highlight
    const highlightsWithStories = await Promise.all(
      highlightsData.map(async (highlight) => {
        const { data: stories } = await supabase
          .from('highlight_stories')
          .select('id, media_url, media_type, caption')
          .eq('highlight_id', highlight.id)
          .order('added_at', { ascending: true });

        return {
          ...highlight,
          stories: stories || [],
        };
      })
    );

    setHighlights(highlightsWithStories);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const handleCreateHighlight = async () => {
    if (!user || !newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('story_highlights')
        .insert({
          user_id: user.id,
          title: newTitle.trim(),
        });

      if (error) throw error;

      toast.success('Highlight created!');
      setCreateDialogOpen(false);
      setNewTitle('');
      fetchHighlights();
    } catch (error) {
      console.error('Error creating highlight:', error);
      toast.error('Failed to create highlight');
    }
  };

  const handleUpdateHighlight = async () => {
    if (!editingHighlight || !newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('story_highlights')
        .update({ title: newTitle.trim() })
        .eq('id', editingHighlight.id);

      if (error) throw error;

      toast.success('Highlight updated!');
      setEditingHighlight(null);
      setNewTitle('');
      fetchHighlights();
    } catch (error) {
      console.error('Error updating highlight:', error);
      toast.error('Failed to update highlight');
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      const { error } = await supabase
        .from('story_highlights')
        .delete()
        .eq('id', highlightId);

      if (error) throw error;

      toast.success('Highlight deleted!');
      fetchHighlights();
    } catch (error) {
      console.error('Error deleting highlight:', error);
      toast.error('Failed to delete highlight');
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 px-4 py-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-10 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 px-4 py-2">
          {isOwnProfile && (
            <HighlightCircle
              title="New"
              isNew
              onClick={() => setCreateDialogOpen(true)}
            />
          )}

          {highlights.map((highlight) => (
            <div key={highlight.id} className="relative group">
              <HighlightCircle
                title={highlight.title}
                coverUrl={highlight.cover_url || undefined}
                onClick={() => {
                  if (highlight.stories.length > 0) {
                    setViewingHighlight(highlight);
                  } else {
                    toast.info('No stories in this highlight');
                  }
                }}
              />

              {isOwnProfile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-background shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingHighlight(highlight);
                        setNewTitle(highlight.title);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteHighlight(highlight.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Highlight Viewer */}
      {viewingHighlight && (
        <HighlightViewer
          stories={viewingHighlight.stories}
          highlightTitle={viewingHighlight.title}
          onClose={() => setViewingHighlight(null)}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Highlight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Highlight name..."
                maxLength={30}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateHighlight}
              disabled={!newTitle.trim()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingHighlight} onOpenChange={() => setEditingHighlight(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Highlight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Highlight name..."
                maxLength={30}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleUpdateHighlight}
              disabled={!newTitle.trim()}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
