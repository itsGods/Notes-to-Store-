export interface User {
  id: string;
  email: string;
}

export interface Note {
  id: string;
  user_id: string; // Supabase uses user_id convention
  title: string;
  content: string;
  updated_at: string; // Supabase returns ISO strings
  created_at?: string;
}

export enum AppView {
  AUTH = 'AUTH',
  LIST = 'LIST',
  EDITOR = 'EDITOR'
}

export enum AIActionType {
  FIX_GRAMMAR = 'FIX_GRAMMAR',
  SUMMARIZE = 'SUMMARIZE',
  CONTINUE_WRITING = 'CONTINUE_WRITING'
}