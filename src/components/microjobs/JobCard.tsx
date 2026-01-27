import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MicroJob } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Briefcase, Clock, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface JobCardProps {
  job: MicroJob;
  onApply: (job: MicroJob, posterUserId: string) => void;
}

export const JobCard = ({ job, onApply }: JobCardProps) => {
  const { user } = useAuth();
  const [poster, setPoster] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchPoster = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('user_id', job.user_id)
        .single();
      
      if (data) setPoster(data);
    };
    fetchPoster();
  }, [job.user_id]);

  const categoryColors: Record<string, string> = {
    gmail: 'bg-red-500/10 text-red-500 border-red-500/30',
    social_media: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    data_entry: 'bg-green-500/10 text-green-500 border-green-500/30',
    design: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    writing: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
    translation: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    video: 'bg-pink-500/10 text-pink-500 border-pink-500/30',
    audio: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    programming: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
    other: 'bg-gray-500/10 text-gray-500 border-gray-500/30'
  };

  const categoryLabels: Record<string, string> = {
    gmail: 'Gmail / Email',
    social_media: 'Social Media',
    data_entry: 'Data Entry',
    design: 'Design',
    writing: 'Writing',
    translation: 'Translation',
    video: 'Video',
    audio: 'Audio',
    programming: 'Programming',
    other: 'Other'
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Please login to apply');
      return;
    }
    if (user.id === job.user_id) {
      toast.error('You cannot apply to your own job');
      return;
    }

    setApplying(true);
    onApply(job, job.user_id);
    setApplying(false);
  };

  const isOwnJob = user?.id === job.user_id;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={poster?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {poster?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{poster?.username || 'User'}</span>
              <Badge variant="outline" className={`text-xs ${categoryColors[job.category] || categoryColors.other}`}>
                {categoryLabels[job.category] || job.category}
              </Badge>
            </div>

            <h3 className="font-semibold mt-1 text-base">{job.title}</h3>
            
            {job.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
            )}

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                <span>LKR {job.budget.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {!isOwnJob && (
            <Button
              size="sm"
              onClick={handleApply}
              disabled={applying}
              className="flex-shrink-0 gap-1"
            >
              <Send className="h-3 w-3" />
              Apply
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
