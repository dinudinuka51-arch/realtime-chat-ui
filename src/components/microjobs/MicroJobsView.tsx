import { useState } from 'react';
import { ArrowLeft, Briefcase, Plus, Wallet, Edit, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMicroJobs } from './useMicroJobs';
import { CreateJobDialog } from './CreateJobDialog';
import { JobCard } from './JobCard';
import { BalanceUpdateDialog } from './BalanceUpdateDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JOB_CATEGORIES, MicroJob } from './types';
import romanLogo from '@/assets/roman-logo.png';
import { Skeleton } from '@/components/ui/skeleton';

interface MicroJobsViewProps {
  onBack: () => void;
  onOpenChat: (conversationId: string) => void;
}

export const MicroJobsView = ({ onBack, onOpenChat }: MicroJobsViewProps) => {
  const { user } = useAuth();
  const { jobs, myBalance, loading, createJob, updateBalance } = useMicroJobs();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredJobs = categoryFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.category === categoryFilter);

  const myJobs = jobs.filter(job => job.user_id === user?.id);

  const handleApply = async (job: MicroJob, posterUserId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      let conversationId: string | null = null;

      if (existingParticipants) {
        for (const p of existingParticipants) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', p.conversation_id)
            .eq('user_id', posterUserId)
            .maybeSingle();

          if (otherParticipant) {
            conversationId = p.conversation_id;
            break;
          }
        }
      }

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConvo, error: convoError } = await supabase
          .from('conversations')
          .insert({})
          .select()
          .single();

        if (convoError || !newConvo) {
          toast.error('Failed to create conversation');
          return;
        }

        conversationId = newConvo.id;

        // Add participants
        await supabase.from('conversation_participants').insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: posterUserId }
        ]);
      }

      // Send auto message about the job application
      const autoMessage = `🎯 *Micro Job Application*\n\nHi! I'm interested in your job:\n\n📋 *${job.title}*\n💰 Budget: LKR ${job.budget.toLocaleString()}\n📂 Category: ${job.category}\n\nI would like to apply for this job. Please let me know if you're interested in working with me!`;

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: autoMessage,
        message_type: 'text'
      });

      toast.success('Application sent! Opening chat...');
      onOpenChat(conversationId);
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error('Failed to apply');
    }
  };

  const categoryLabels: Record<string, string> = {
    all: 'All Jobs',
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

  return (
    <div className="flex flex-col h-full bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/10 to-orange-500/10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img src={romanLogo} alt="Roman" className="h-8 w-8 rounded-lg" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Micro Jobs</h1>
          <p className="text-xs text-muted-foreground">Find work or post jobs</p>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Post Job
        </Button>
      </header>

      {/* Balance Card */}
      <div className="p-4 border-b bg-gradient-to-r from-green-500/5 to-emerald-500/5">
        <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/20">
                  <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">My Balance</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    LKR {myBalance?.balance_lkr?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBalanceDialog(true)}
                className="gap-1 border-green-500/30 hover:bg-green-500/10"
              >
                <Edit className="h-3 w-3" />
                Update Balance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="browse" className="h-full flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse" className="gap-1">
                <Briefcase className="h-4 w-4" />
                Browse Jobs
              </TabsTrigger>
              <TabsTrigger value="my-jobs" className="gap-1">
                <Badge variant="secondary" className="h-5 px-1.5">{myJobs.length}</Badge>
                My Jobs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browse" className="flex-1 overflow-hidden mt-0">
            {/* Filter */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {JOB_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))
              ) : filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} onApply={handleApply} />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No jobs found</p>
                  <p className="text-sm">Be the first to post a job!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-jobs" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            ) : myJobs.length > 0 ? (
              myJobs.map((job) => (
                <JobCard key={job.id} job={job} onApply={() => {}} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No jobs posted yet</p>
                <Button 
                  variant="outline" 
                  className="mt-3" 
                  onClick={() => setShowCreateDialog(true)}
                >
                  Post Your First Job
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateJobDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateJob={createJob}
      />

      <BalanceUpdateDialog
        open={showBalanceDialog}
        onOpenChange={setShowBalanceDialog}
        onUpdateBalance={updateBalance}
      />
    </div>
  );
};
