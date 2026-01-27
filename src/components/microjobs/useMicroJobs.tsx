import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MicroJob, MicroBalance } from './types';
import { toast } from 'sonner';

export const useMicroJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<MicroJob[]>([]);
  const [myBalance, setMyBalance] = useState<MicroBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('micro_jobs')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs((data || []) as MicroJob[]);
    }
  }, []);

  const fetchMyBalance = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('micro_balances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching balance:', error);
    } else if (data) {
      setMyBalance(data as MicroBalance);
    } else {
      // Create initial balance for user
      const { data: newBalance, error: createError } = await supabase
        .from('micro_balances')
        .insert({ user_id: user.id, balance_lkr: 0 })
        .select()
        .single();

      if (!createError && newBalance) {
        setMyBalance(newBalance as MicroBalance);
      }
    }
  }, [user]);

  const createJob = async (job: Omit<MicroJob, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('micro_jobs')
      .insert({
        ...job,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create job');
      return { error };
    }

    toast.success('Job posted successfully!');
    await fetchJobs();
    return { data };
  };

  const updateBalance = async (userId: string, newBalance: number) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Check if user has a balance record
    const { data: existing } = await supabase
      .from('micro_balances')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('micro_balances')
        .update({ balance_lkr: newBalance, updated_by: user.id })
        .eq('user_id', userId);

      if (error) {
        toast.error('Failed to update balance');
        return { error };
      }
    } else {
      // Create balance record with initial value
      const { error } = await supabase
        .from('micro_balances')
        .insert({ user_id: userId, balance_lkr: newBalance, updated_by: user.id });

      if (error) {
        toast.error('Failed to create balance');
        return { error };
      }
    }

    toast.success('Balance updated successfully!');
    return { success: true };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJobs(), fetchMyBalance()]);
      setLoading(false);
    };
    loadData();

    // Subscribe to realtime updates
    const jobsChannel = supabase
      .channel('micro_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'micro_jobs' }, fetchJobs)
      .subscribe();

    const balanceChannel = supabase
      .channel('micro_balances_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'micro_balances' }, fetchMyBalance)
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(balanceChannel);
    };
  }, [fetchJobs, fetchMyBalance]);

  return {
    jobs,
    myBalance,
    loading,
    createJob,
    updateBalance,
    refreshJobs: fetchJobs,
    refreshBalance: fetchMyBalance
  };
};
