import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get or create a user
export const getOrCreateUser = async (username) => {
  try {
    // Try to upsert the user with the given username
    const { data: user, error: upsertError } = await supabase
      .from('chat_users')
      .upsert({
        username,
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'username',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (upsertError) {
      // If there's a conflict, generate a new unique username
      const newUsername = `${username}_${Math.random().toString(36).substring(2, 5)}`;
      const { data: newUser, error: retryError } = await supabase
        .from('chat_users')
        .insert([{ 
          username: newUsername,
          last_seen: new Date().toISOString()
        }])
        .select()
        .single();

      if (retryError) {
        throw retryError;
      }

      return newUser;
    }

    return user;
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  }
};