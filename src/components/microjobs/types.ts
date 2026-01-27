export interface MicroJob {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  budget: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MicroBalance {
  id: string;
  user_id: string;
  balance_lkr: number;
  updated_at: string;
  updated_by: string | null;
}

export const JOB_CATEGORIES = [
  'gmail',
  'social_media',
  'data_entry',
  'design',
  'writing',
  'translation',
  'video',
  'audio',
  'programming',
  'other'
] as const;

export type JobCategory = typeof JOB_CATEGORIES[number];
