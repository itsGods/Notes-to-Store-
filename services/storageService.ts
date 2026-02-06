import { supabase } from './supabaseClient';
import { User, Note } from '../types';

// --- User Management ---

export const registerUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered')) {
          return { user: null, error: 'This email is already registered. Please log in instead.' };
      }
      // Handle rate limits (429 Too Many Requests)
      if (msg.includes('rate limit') || msg.includes('too many requests') || error.status === 429) {
          return { user: null, error: 'Too many attempts. Please wait 2 minutes before trying again.' };
      }
      return { user: null, error: error.message };
    }

    // Handle "fake success" for privacy (User exists but Supabase returns 200)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { user: null, error: 'This email is already registered. Please log in instead.' };
    }

    // Check if email confirmation is required (Session is null but User exists)
    if (data.user && !data.session) {
      return { 
        user: null, 
        error: 'Account created! Please check your email to confirm your account before logging in.' 
      };
    }

    if (data.user && data.session) {
      return { 
        user: { id: data.user.id, email: data.user.email! }, 
        error: null 
      };
    }

    return { user: null, error: 'Registration failed for an unknown reason.' };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { user: null, error: err.message || 'Connection failed. Please check your internet.' };
  }
};

export const loginUser = async (email: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed')) {
        return { user: null, error: 'Please check your email to confirm your account.' };
      }
      // Handle rate limits (429 Too Many Requests)
      if (msg.includes('rate limit') || msg.includes('too many requests') || error.status === 429) {
          return { user: null, error: 'Too many login attempts. Please wait a minute before trying again.' };
      }
      // General invalid login credential error handling
      if (msg.includes('invalid login credentials')) {
         return { user: null, error: 'Incorrect email or password.' };
      }
      return { user: null, error: error.message }; 
    }

    if (data.user) {
      return { 
        user: { id: data.user.id, email: data.user.email! }, 
        error: null 
      };
    }
    
    return { user: null, error: 'Login failed' };
  } catch (err: any) {
    console.error("Login error:", err);
    return { user: null, error: err.message || 'Connection failed. Please check your internet.' };
  }
};

export const logoutUser = async () => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Logout error:", err);
  }
};

export const getSessionUser = async (): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn("Session error:", error.message);
      return null;
    }

    if (data.session?.user) {
      return {
        id: data.session.user.id,
        email: data.session.user.email!
      };
    }
    return null;
  } catch (err) {
    // Catch "Failed to fetch" and other network errors here
    console.error("Failed to retrieve session:", err);
    return null;
  }
};

// --- Note Management ---

export const getNotes = async (userId: string): Promise<Note[]> => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
    
    return data as Note[] || [];
  } catch (err) {
    console.error("Network error fetching notes:", err);
    return [];
  }
};

export const saveNote = async (note: Note) => {
  try {
    const { error } = await supabase
      .from('notes')
      .upsert(note);

    if (error) {
      console.error('Error saving note:', error);
      throw new Error(error.message);
    }
  } catch (err: any) {
    console.error("Network error saving note:", err);
    throw new Error(err.message || "Failed to connect to server");
  }
};

export const deleteNote = async (noteId: string) => {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
    }
  } catch (err) {
    console.error("Network error deleting note:", err);
  }
};