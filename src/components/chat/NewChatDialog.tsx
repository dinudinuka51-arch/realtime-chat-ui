import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/chat';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export const NewChatDialog = ({
  open,
  onOpenChange,
  onConversationCreated,
}: NewChatDialogProps) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id);

      if (error) throw error;
      setUsers(data as Profile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    if (otherUserId === user.id) return;

    setCreating(true);

    try {
      // 1) Fetch my conversation ids
      const { data: myConvs, error: myConvsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (myConvsError) throw myConvsError;

      const myConvIds = myConvs?.map((c) => c.conversation_id) ?? [];

      // 2) Check if the other user is already in any of my conversations
      if (myConvIds.length > 0) {
        const { data: matches, error: matchesError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', myConvIds)
          .eq('user_id', otherUserId)
          .limit(1);

        if (matchesError) throw matchesError;

        const existingConv = matches?.[0]?.conversation_id;
        if (existingConv) {
          onConversationCreated(existingConv);
          onOpenChange(false);
          return;
        }
      }

      // 3) Create a new conversation WITHOUT selecting it back (RLS blocks selecting
      //    until participants are added, which made the old code fail).
      const conversationId = crypto.randomUUID();

      const { error: convError } = await supabase
        .from('conversations')
        .insert({ id: conversationId });

      if (convError) throw convError;

      // 4) Add both participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      toast.success('Conversation started!');
      onConversationCreated(conversationId);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No users found' : 'No users available'}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((profile) => (
                  <Button
                    key={profile.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-3"
                    onClick={() => startConversation(profile.user_id)}
                    disabled={creating}
                  >
                    <div className="relative mr-3">
                      <Avatar>
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(profile.full_name, profile.username)}
                        </AvatarFallback>
                      </Avatar>
                      {profile.is_online && (
                        <span className="absolute bottom-0 right-0 online-indicator" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {profile.full_name || profile.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{profile.username}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
